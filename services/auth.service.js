const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db/pool');

const WX_APPID = process.env.WX_APPID || '';
const WX_SECRET = process.env.WX_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'nihonnuta_jwt_secret_default';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * 调用微信 jscode2session 接口，用 code 换取 openid + session_key
 */
async function wxCodeToSession(code) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const res = await axios.get(url, {
    params: {
      appid: WX_APPID,
      secret: WX_SECRET,
      js_code: code,
      grant_type: 'authorization_code',
    },
  });
  if (res.data.errcode) {
    throw new Error(`微信登录失败: ${res.data.errmsg}`);
  }
  return {
    openid: res.data.openid,
    session_key: res.data.session_key,
  };
}

/**
 * 根据 openid 查找用户，不存在则自动创建
 */
async function findOrCreateUserByOpenid(openid) {
  // 先查找
  const findRes = await pool.query(
    'SELECT * FROM users WHERE wx_openid = $1 AND is_deleted = FALSE',
    [openid]
  );
  if (findRes.rows.length > 0) {
    return findRes.rows[0];
  }
  // 不存在则创建
  const userId = crypto.randomUUID();
  const suffix = openid.slice(-4);
  const username = `歌词学习者${suffix}`;
  const insertRes = await pool.query(
    `INSERT INTO users (user_id, username, wx_openid, avatar_url)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, username, openid, '']
  );
  return insertRes.rows[0];
}

/**
 * 生成 JWT token
 */
function generateToken(userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  // 解析 expiresIn 为秒数
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - decoded.iat;
  return { token, expiresIn };
}

/**
 * 验证 JWT token
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * 根据 userId 获取用户信息
 */
async function getUserById(userId) {
  const res = await pool.query(
    'SELECT user_id, username, avatar_url, level, total_learn_words, total_learn_time FROM users WHERE user_id = $1 AND is_deleted = FALSE',
    [userId]
  );
  return res.rows[0] || null;
}

/**
 * 更新用户信息
 */
async function updateUserInfo(userId, { username, avatar_url }) {
  const fields = [];
  const values = [];
  let idx = 1;

  if (username !== undefined) {
    fields.push(`username = $${idx++}`);
    values.push(username);
  }
  if (avatar_url !== undefined) {
    fields.push(`avatar_url = $${idx++}`);
    values.push(avatar_url);
  }
  if (fields.length === 0) return null;

  values.push(userId);
  const res = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx} AND is_deleted = FALSE RETURNING user_id, username, avatar_url, level, total_learn_words, total_learn_time`,
    values
  );
  return res.rows[0] || null;
}

module.exports = {
  wxCodeToSession,
  findOrCreateUserByOpenid,
  generateToken,
  verifyToken,
  getUserById,
  updateUserInfo,
};
