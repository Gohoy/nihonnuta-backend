-- Add SRS (Spaced Repetition System) columns for SM-2 algorithm

-- user_wordbooks
ALTER TABLE user_wordbooks
  ADD COLUMN IF NOT EXISTS ease_factor NUMERIC(4,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date DATE DEFAULT CURRENT_DATE;

-- user_grammar_books
ALTER TABLE user_grammar_books
  ADD COLUMN IF NOT EXISTS ease_factor NUMERIC(4,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_review_date DATE DEFAULT CURRENT_DATE;

-- Indexes for efficient review queries
CREATE INDEX IF NOT EXISTS idx_wordbooks_user_review
  ON user_wordbooks (user_id, next_review_date);

CREATE INDEX IF NOT EXISTS idx_grammarbooks_user_review
  ON user_grammar_books (user_id, next_review_date);
