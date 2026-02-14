-- 修复audio_url字段长度限制
-- 将audio_url从VARCHAR(255)改为TEXT以支持更长的URL
-- 执行时间: 2025-02-07

ALTER TABLE songs ALTER COLUMN audio_url TYPE TEXT;

-- 同时修复cover_url字段，以防万一
ALTER TABLE songs ALTER COLUMN cover_url TYPE TEXT;

