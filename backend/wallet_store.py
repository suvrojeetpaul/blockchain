"""Private SQLite storage for wallet search history and analysis snapshots."""

import json
import logging
import os
import sqlite3
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from contextlib import closing
from typing import Any, Optional


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parent / "data" / "wallet_searches.db"
LOGGER = logging.getLogger(__name__)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class WalletStore:
    """Persists every completed search without exposing database endpoints."""

    def __init__(self, database_path: Optional[Path] = None) -> None:
        configured_path = os.getenv("WALLET_DATABASE_PATH")
        preferred_path = Path(configured_path) if configured_path else (
            database_path or DEFAULT_DATABASE_PATH
        )
        self.database_path = preferred_path
        try:
            self._initialize()
        except (OSError, sqlite3.OperationalError) as exc:
            fallback_path = self._fallback_path()
            if fallback_path == self.database_path:
                raise
            LOGGER.warning(
                "Wallet database path %s is not writable; using %s: %s",
                self.database_path,
                fallback_path,
                exc,
            )
            self.database_path = fallback_path
            self._initialize()

    @staticmethod
    def _fallback_path() -> Path:
        app_data = os.getenv("LOCALAPPDATA") or os.getenv("XDG_DATA_HOME")
        root = Path(app_data) if app_data else Path(tempfile.gettempdir())
        return root / "blocksphere" / "wallet_searches.db"

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
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

        try:
            self._record_search(
                wallet_address,
                blockchain,
                max_transactions,
                analysis_json,
                summary,
                cache_hit,
                now,
            )
        except sqlite3.OperationalError as exc:
            if "readonly" not in str(exc).lower() and "permission" not in str(exc).lower():
                raise
            fallback_path = self._fallback_path()
            if fallback_path == self.database_path:
                raise
            LOGGER.warning(
                "Wallet database became unavailable at %s; switching to %s: %s",
                self.database_path,
                fallback_path,
                exc,
            )
            self.database_path = fallback_path
            self._initialize()
            self._record_search(
                wallet_address,
                blockchain,
                max_transactions,
                analysis_json,
                summary,
                cache_hit,
                now,
            )

    def _record_search(
        self,
        wallet_address: str,
        blockchain: str,
        max_transactions: int,
        analysis_json: str,
        summary: dict[str, Any],
        cache_hit: bool,
        now: str,
    ) -> None:
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
