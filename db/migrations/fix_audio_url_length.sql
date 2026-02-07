-- 修复audio_url字段长度限制
-- 将audio_url从VARCHAR(255)改为TEXT以支持更长的URL

ALTER TABLE songs ALTER COLUMN audio_url TYPE TEXT;

