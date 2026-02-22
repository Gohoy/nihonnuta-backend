const pool = require("../db/pool");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "nihonnuta_dev_jwt_secret_2026";
const WX_APP_ID = process.env.WX_APP_ID || "wx0124c2a4ca8487b6";
const WX_APP_SECRET = process.env.WX_APP_SECRET || "";
const TOKEN_EXPIRES_IN = 604800; // 7 days in seconds

function generateUserId() {
  return `u_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function signToken(userId, username) {
  const token = jwt.sign({ userId, username }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
  return { token, expiresIn: TOKEN_EXPIRES_IN };
}

async function register(username, password) {
  // Check if username already exists
  const { rows: existing } = await pool.query(
    "SELECT user_id FROM users WHERE username = $1 AND is_deleted = FALSE",
    [username]
  );
  if (existing.length > 0) {
    throw { status: 400, message: "用户名已存在" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = generateUserId();

  await pool.query(
    `INSERT INTO users (user_id, username, password_hash, nickname)
     VALUES ($1, $2, $3, $4)`,
    [userId, username, passwordHash, username]
  );

  return signToken(userId, username);
}

async function login(username, password) {
  const { rows } = await pool.query(
    "SELECT user_id, username, password_hash FROM users WHERE username = $1 AND is_deleted = FALSE",
    [username]
  );
  if (rows.length === 0) {
    throw { status: 400, message: "用户名或密码错误" };
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw { status: 400, message: "用户名或密码错误" };
  }

  return signToken(user.user_id, user.username);
}

async function wxLogin(code) {
  // Exchange code for openid via WeChat API
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    console.error("WeChat jscode2session error:", data);
    throw { status: 400, message: "微信登录失败: " + (data.errmsg || "未知错误") };
  }

  const openid = data.openid;
  if (!openid) {
    throw { status: 400, message: "微信登录失败: 未获取到openid" };
  }

  // Find or create user by openid
  const { rows: existing } = await pool.query(
    "SELECT user_id, username FROM users WHERE wx_openid = $1 AND is_deleted = FALSE",
    [openid]
  );

  if (existing.length > 0) {
    return signToken(existing[0].user_id, existing[0].username);
  }

  // Create new user
  const userId = generateUserId();
  const username = `wx_${openid.substring(0, 8)}`;

  await pool.query(
    `INSERT INTO users (user_id, username, wx_openid, nickname)
     VALUES ($1, $2, $3, $4)`,
    [userId, username, openid, "微信用户"]
  );

  return signToken(userId, username);
}

async function getUserInfo(userId) {
  const { rows } = await pool.query(
    "SELECT user_id, username, nickname, avatar_url, level, role, membership_type, membership_expire_time FROM users WHERE user_id = $1 AND is_deleted = FALSE",
    [userId]
  );
  if (rows.length === 0) {
    throw { status: 404, message: "用户不存在" };
  }

  const user = rows[0];

  // Auto-downgrade expired membership
  let membershipType = user.membership_type || "free";
  if (
    membershipType === "premium" &&
    user.membership_expire_time &&
    new Date(user.membership_expire_time) < new Date()
  ) {
    membershipType = "free";
    pool
      .query("UPDATE users SET membership_type = 'free' WHERE user_id = $1", [
        userId,
      ])
      .catch(() => {});
  }

  const userRole = user.role || "user";

  return {
    userId: user.user_id,
    username: user.username,
    nickname: user.nickname || user.username,
    avatar: user.avatar_url || "",
    level: user.level || "N5",
    role: userRole,
    membershipType,
    membershipExpireTime:
      membershipType === "premium" ? user.membership_expire_time : null,
    isAdmin: userRole === "admin",
  };
}

async function updateUserLevel(userId, level) {
  const validLevels = ['N1', 'N2', 'N3', 'N4', 'N5'];
  if (!validLevels.includes(level)) {
    throw { status: 400, message: "无效的JLPT等级" };
  }
  const { rows } = await pool.query(
    "UPDATE users SET level = $1 WHERE user_id = $2 AND is_deleted = FALSE RETURNING level",
    [level, userId]
  );
  if (rows.length === 0) {
    throw { status: 404, message: "用户不存在" };
  }
  return { level: rows[0].level };
}

module.exports = { register, login, wxLogin, getUserInfo, updateUserLevel };
