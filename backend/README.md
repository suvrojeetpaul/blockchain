# Backend storage and cache

Successful wallet searches are stored privately in `data/wallet_searches.db`.
The SQLite database is not served by FastAPI and is ignored by Git.

The database contains:

- `wallet_records`: the latest full analysis for each wallet and aggregate
  search metadata.
- `wallet_searches`: one row for every successful search, including whether
  the response came from the in-process cache.

The API also keeps successful analyses in a thread-safe in-process LRU cache.
By default entries live for five minutes and the cache holds 128 wallet/query
combinations. Configure these values before starting the backend:

```text
WALLET_CACHE_TTL_SECONDS=300
WALLET_CACHE_MAX_ENTRIES=128
```

The cache is intentionally process-local and is cleared when the server
restarts. SQLite remains the durable source for backend review.
