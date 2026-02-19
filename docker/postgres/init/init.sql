CREATE DATABASE songs;


CREATE OR REPLACE FUNCTION set_update_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TABLE users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT '',
    wx_openid VARCHAR(128) UNIQUE,
    nickname VARCHAR(50) DEFAULT '',
    avatar_url VARCHAR(255) DEFAULT '',
    phone VARCHAR(20) UNIQUE,
    email VARCHAR(100) UNIQUE,
    level VARCHAR(10) DEFAULT 'N5',
    total_learn_words INT DEFAULT 0,
    total_learn_time INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_create_time ON users(create_time);

CREATE TRIGGER trg_users_update_time
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_update_time();



CREATE TABLE songs (
    song_id VARCHAR(64) PRIMARY KEY,
    song_name VARCHAR(100) NOT NULL,
    song_name_cn VARCHAR(100) DEFAULT '',
    singer VARCHAR(100) NOT NULL,
    album VARCHAR(100) DEFAULT '',
    difficulty VARCHAR(10) NOT NULL,
    audio_url TEXT NOT NULL,
    cover_url TEXT DEFAULT '',
    lyrics JSONB DEFAULT '{}'::jsonb,
    lyrics_text TEXT DEFAULT '',
    play_count INT DEFAULT 0,
    collect_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'published',
    is_public BOOLEAN DEFAULT TRUE,
    create_user VARCHAR(64),
    kana_overrides JSONB DEFAULT '{}'::jsonb,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_songs_singer ON songs(singer);
CREATE INDEX idx_songs_difficulty ON songs(difficulty);
CREATE INDEX idx_songs_status ON songs(status);
CREATE INDEX idx_songs_lyrics_gin ON songs USING GIN (lyrics);

CREATE TRIGGER trg_songs_update_time
BEFORE UPDATE ON songs
FOR EACH ROW
EXECUTE FUNCTION set_update_time();


CREATE TABLE user_learning_records (
    record_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    song_id VARCHAR(64) NOT NULL,
    learn_progress INT DEFAULT 0,
    learn_time INT DEFAULT 0,
    master_rate NUMERIC(5,2) DEFAULT 0.00,
    learn_date DATE DEFAULT CURRENT_DATE,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_song_date UNIQUE (user_id, song_id, learn_date)
);

CREATE INDEX idx_learning_user_song ON user_learning_records(user_id, song_id);
CREATE INDEX idx_learning_learn_date ON user_learning_records(learn_date);


CREATE TABLE user_collections (
    collection_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    song_id VARCHAR(64) NOT NULL,
    collect_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_collect_song UNIQUE (user_id, song_id)
);

CREATE INDEX idx_collect_user ON user_collections(user_id);
CREATE INDEX idx_collect_collect_time ON user_collections(collect_time);


CREATE TABLE user_uploads (
    upload_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    song_name VARCHAR(100) NOT NULL,
    singer VARCHAR(100) NOT NULL,
    difficulty VARCHAR(10) NOT NULL,
    audio_url VARCHAR(255) NOT NULL,
    lyrics JSONB NOT NULL,
    audit_status VARCHAR(20) DEFAULT 'pending',
    is_public BOOLEAN DEFAULT TRUE,
    audit_remark VARCHAR(255) DEFAULT '',
    audit_user VARCHAR(64),
    audit_time TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_upload_user ON user_uploads(user_id);
CREATE INDEX idx_upload_audit_status ON user_uploads(audit_status);
CREATE INDEX idx_upload_create_time ON user_uploads(create_time);


CREATE TABLE user_wordbooks (
    word_book_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    song_id VARCHAR(64) NOT NULL,
    line_num INT NOT NULL,
    token_id INT NOT NULL,
    word VARCHAR(50) NOT NULL,
    kana VARCHAR(50) DEFAULT '',
    pos VARCHAR(50) DEFAULT '',
    meaning VARCHAR(255) NOT NULL,
    master_status VARCHAR(20) DEFAULT 'unmastered',
    review_count INT DEFAULT 0,
    last_review_time TIMESTAMP,
    note TEXT DEFAULT '',
    example_sentence TEXT DEFAULT '',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_word UNIQUE (user_id, song_id, line_num, token_id)
);

CREATE INDEX idx_word_user_status ON user_wordbooks(user_id, master_status);
CREATE INDEX idx_word_song_line ON user_wordbooks(song_id, line_num);


CREATE TABLE user_grammar_books (
    grammar_book_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    song_id VARCHAR(64) NOT NULL,
    line_num INT NOT NULL,
    grammar_id INT NOT NULL,
    related_token_ids JSONB NOT NULL,
    grammar_type VARCHAR(50) NOT NULL,
    grammar_relation VARCHAR(50) NOT NULL,
    structure_desc VARCHAR(100) NOT NULL,
    grammar_desc TEXT NOT NULL,
    master_status VARCHAR(20) DEFAULT 'unmastered',
    review_count INT DEFAULT 0,
    last_review_time TIMESTAMP,
    note TEXT DEFAULT '',
    example_sentence TEXT DEFAULT '',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_user_grammar UNIQUE (user_id, song_id, line_num, grammar_id)
);

CREATE INDEX idx_grammar_user_status ON user_grammar_books(user_id, master_status);
CREATE INDEX idx_grammar_relation ON user_grammar_books(grammar_relation);


CREATE TABLE lyrics_suggestions (
    id            SERIAL PRIMARY KEY,
    song_id       VARCHAR(64) NOT NULL REFERENCES songs(song_id),
    line_index    INTEGER NOT NULL,
    time_ms       INTEGER,
    field         VARCHAR(20) NOT NULL,
    token_text    VARCHAR(100) DEFAULT '',
    old_value     TEXT NOT NULL DEFAULT '',
    new_value     TEXT NOT NULL,
    reason        TEXT DEFAULT '',
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    submitted_by  VARCHAR(64) NOT NULL,
    reviewed_by   VARCHAR(64),
    reviewed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestions_song_status ON lyrics_suggestions(song_id, status);
CREATE INDEX idx_suggestions_submitted_by ON lyrics_suggestions(submitted_by);
