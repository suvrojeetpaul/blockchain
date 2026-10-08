"""Small in-process cache for completed wallet analyses."""

from collections import OrderedDict
from dataclasses import dataclass
from threading import Lock
from time import monotonic
from typing import Any


@dataclass
class _CacheEntry:
    value: dict[str, Any]
    expires_at: float


class WalletAnalysisCache:
    """Thread-safe TTL/LRU cache that only stores successful analyses."""

    def __init__(self, max_entries: int = 128, ttl_seconds: int = 300) -> None:
        if max_entries < 1:
            raise ValueError("max_entries must be at least 1")
        if ttl_seconds < 1:
            raise ValueError("ttl_seconds must be at least 1")

        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self._entries: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._lock = Lock()

    def get(self, key: str) -> dict[str, Any] | None:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None

            if entry.expires_at <= monotonic():
                del self._entries[key]
                return None

            self._entries.move_to_end(key)
            return entry.value

    def set(self, key: str, value: dict[str, Any]) -> None:
        with self._lock:
            self._entries[key] = _CacheEntry(
                value=value,
                expires_at=monotonic() + self.ttl_seconds,
            )
            self._entries.move_to_end(key)

            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()
