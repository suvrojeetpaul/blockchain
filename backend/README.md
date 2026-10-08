# Backend storage and cache

Successful wallet searches are stored privately in `data/wallet_searches.db`.
The SQLite database is not served by FastAPI and is ignored by Git.

For hosting platforms where the application directory is read-only, set
`WALLET_DATABASE_PATH` to a writable mounted volume. If it is not set and the
project directory cannot be written, the backend automatically falls back to
the platform's local application-data or temporary directory so requests do
not fail with a read-only database error. Hosted temporary storage may be
ephemeral, so use a mounted volume for durable history.

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
