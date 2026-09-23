CREATE TABLE IF NOT EXISTS audio_files (
    id            SERIAL PRIMARY KEY,
    sha256_hash   CHAR(64)          NOT NULL UNIQUE,
    original_name VARCHAR(255)      NOT NULL,
    file_path     TEXT              NOT NULL,
    file_size     INTEGER           NOT NULL,
    duration_sec  NUMERIC(10, 3)    NOT NULL,
    duration_fmt  VARCHAR(10)       NOT NULL,
    bitrate       INTEGER,
    sample_rate   INTEGER,
    quality_score NUMERIC(3, 1)     NOT NULL,
    is_outlier    BOOLEAN           NOT NULL DEFAULT FALSE,
    is_duplicate  BOOLEAN           NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_files_sha256
    ON audio_files (sha256_hash);

CREATE INDEX IF NOT EXISTS idx_audio_files_created_at
    ON audio_files (created_at);
