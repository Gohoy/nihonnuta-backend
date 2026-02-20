-- users 表加会员字段
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS membership_type VARCHAR(20) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS membership_expire_time TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_membership ON users(membership_type);

-- 兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
    code_id BIGSERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    membership_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
    duration_days INT NOT NULL DEFAULT 30,
    status VARCHAR(20) DEFAULT 'unused',
    batch_id VARCHAR(64),
    redeemed_by VARCHAR(64) REFERENCES users(user_id),
    redeemed_at TIMESTAMP,
    created_by VARCHAR(64),
    expire_time TIMESTAMP,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redemption_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_status ON redemption_codes(status);
