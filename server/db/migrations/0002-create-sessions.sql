CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash BLOB NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL
) STRICT;

CREATE INDEX sessions_by_user ON sessions (user_id);
