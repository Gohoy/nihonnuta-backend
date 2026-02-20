const crypto = require("crypto");
const pool = require("../db/pool");

function generateCode() {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

async function generateBatch(count, membershipType, durationDays, createdBy, expireDays) {
  const batchId = `batch_${Date.now()}`;
  const expireTime = expireDays
    ? new Date(Date.now() + expireDays * 86400000)
    : null;
  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = generateCode();
    await pool.query(
      `INSERT INTO redemption_codes (code, membership_type, duration_days, batch_id, created_by, expire_time)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [code, membershipType, durationDays, batchId, createdBy, expireTime]
    );
    codes.push(code);
  }

  return { batchId, codes, count: codes.length };
}

async function redeemCode(userId, code) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT * FROM redemption_codes WHERE code = $1 FOR UPDATE",
      [code]
    );
    if (!rows[0]) throw { status: 400, message: "兑换码不存在" };

    const codeRow = rows[0];
    if (codeRow.status !== "unused")
      throw { status: 400, message: "兑换码已被使用" };
    if (codeRow.expire_time && new Date(codeRow.expire_time) < new Date())
      throw { status: 400, message: "兑换码已过期" };

    // Mark code as used
    await client.query(
      "UPDATE redemption_codes SET status = 'used', redeemed_by = $1, redeemed_at = NOW() WHERE code_id = $2",
      [userId, codeRow.code_id]
    );

    // Extend user membership
    const { rows: userRows } = await client.query(
      "SELECT membership_expire_time FROM users WHERE user_id = $1",
      [userId]
    );
    const currentExpire = userRows[0]?.membership_expire_time;
    const baseDate =
      currentExpire && new Date(currentExpire) > new Date()
        ? new Date(currentExpire)
        : new Date();
    const newExpire = new Date(
      baseDate.getTime() + codeRow.duration_days * 86400000
    );

    await client.query(
      "UPDATE users SET membership_type = 'premium', membership_expire_time = $1 WHERE user_id = $2",
      [newExpire, userId]
    );

    await client.query("COMMIT");
    return { membershipType: "premium", expireTime: newExpire };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function listCodes(batchId, status, limit = 50, offset = 0) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (batchId) {
    conditions.push(`batch_id = $${idx++}`);
    params.push(batchId);
  }
  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT code_id, code, membership_type, duration_days, status, batch_id, redeemed_by, redeemed_at, expire_time, create_time
     FROM redemption_codes ${where}
     ORDER BY create_time DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return rows;
}

module.exports = { generateBatch, redeemCode, listCodes };
