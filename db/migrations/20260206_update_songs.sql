-- Add lyrics_text and visibility defaults for songs
ALTER TABLE songs
  ADD COLUMN IF NOT EXISTS lyrics_text TEXT DEFAULT '';

ALTER TABLE songs
  ALTER COLUMN lyrics DROP NOT NULL;

ALTER TABLE songs
  ALTER COLUMN lyrics SET DEFAULT '{}'::jsonb;

ALTER TABLE songs
  ALTER COLUMN status SET DEFAULT 'published';

ALTER TABLE songs
  ALTER COLUMN is_public SET DEFAULT TRUE;
