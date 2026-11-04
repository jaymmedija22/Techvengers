-- Store secure, single-use tokens for first-time password setup.
CREATE TABLE IF NOT EXISTS account_setup_token (
    account_setup_token_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_account_setup_token_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(userid)
        ON DELETE CASCADE
);

-- Improve lookup performance when checking tokens by user.
CREATE INDEX IF NOT EXISTS idx_account_setup_token_user_id
ON account_setup_token(user_id);