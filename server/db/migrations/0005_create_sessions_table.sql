
-- Create the PostgreSQL table used by express-session.
CREATE TABLE IF NOT EXISTS "session" (
    sid VARCHAR NOT NULL,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,
    CONSTRAINT session_pkey PRIMARY KEY (sid)
);

-- Index expiration timestamps for efficient session cleanup.
CREATE INDEX IF NOT EXISTS idx_session_expire
ON "session" (expire);
