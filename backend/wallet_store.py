"""Private SQLite storage for wallet search history and analysis snapshots."""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from contextlib import closing


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent / "data" / "wallet_searches.db"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class WalletStore:
    """Persists every completed search without exposing database endpoints."""

    def __init__(self, database_path: Path = DEFAULT_DATABASE_PATH) -> None:
        self.database_path = Path(database_path)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with closing(self._connect()) as connection:
            with connection:
                connection.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS wallet_records (
                        wallet_address TEXT PRIMARY KEY,
                        blockchain TEXT NOT NULL,
                        first_searched_at TEXT NOT NULL,
                        last_searched_at TEXT NOT NULL,
                        search_count INTEGER NOT NULL DEFAULT 0,
                        risk_score REAL,
                        risk_level TEXT,
                        analysis_json TEXT NOT NULL
                    );

                    CREATE TABLE IF NOT EXISTS wallet_searches (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        wallet_address TEXT NOT NULL,
                        blockchain TEXT NOT NULL,
                        max_transactions INTEGER NOT NULL,
                        searched_at TEXT NOT NULL,
                        cache_hit INTEGER NOT NULL DEFAULT 0,
                        analysis_json TEXT NOT NULL
                    );

                    CREATE INDEX IF NOT EXISTS idx_wallet_searches_address
                        ON wallet_searches(wallet_address);
                    CREATE INDEX IF NOT EXISTS idx_wallet_searches_searched_at
                        ON wallet_searches(searched_at);
                    """
                )

    def record_search(
        self,
        wallet_address: str,
        blockchain: str,
        max_transactions: int,
        analysis: dict[str, Any],
        cache_hit: bool,
    ) -> None:
        now = _utc_now()
        analysis_json = json.dumps(analysis, separators=(",", ":"))
        summary = analysis.get("summary", {})

        with closing(self._connect()) as connection:
            with connection:
                connection.execute(
                    """
                    INSERT INTO wallet_records (
                        wallet_address, blockchain, first_searched_at,
                        last_searched_at, search_count, risk_score,
                        risk_level, analysis_json
                    )
                    VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                    ON CONFLICT(wallet_address) DO UPDATE SET
                        blockchain = excluded.blockchain,
                        last_searched_at = excluded.last_searched_at,
                        search_count = wallet_records.search_count + 1,
                        risk_score = excluded.risk_score,
                        risk_level = excluded.risk_level,
                        analysis_json = excluded.analysis_json
                    """,
                    (
                        wallet_address,
                        blockchain,
                        now,
                        now,
                        summary.get("risk_score"),
                        summary.get("risk_level"),
                        analysis_json,
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO wallet_searches (
                        wallet_address, blockchain, max_transactions,
                        searched_at, cache_hit, analysis_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        wallet_address,
                        blockchain,
                        max_transactions,
                        now,
                        int(cache_hit),
                        analysis_json,
                    ),
                )
