-- 添加微信 openid 列
ALTER TABLE users ADD COLUMN IF NOT EXISTS wx_openid VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_wx_openid ON users(wx_openid);
