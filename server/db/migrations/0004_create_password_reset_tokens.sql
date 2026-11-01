CREATE TABLE password_reset_token (
    password_reset_token_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    user_id INTEGER NOT NULL,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    is_used BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_password_reset_token_user
        FOREIGN KEY (user_id)
        REFERENCES app_user(userid)
        ON DELETE CASCADE
);

CREATE INDEX idx_password_reset_token_user_id
    ON password_reset_token(user_id);