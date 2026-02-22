const pool = require("../db/pool");

async function listUsers({ search, offset = 0, limit = 20 }) {
  const conditions = ["is_deleted = FALSE"];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(username ILIKE $${idx} OR nickname ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(" AND ");
  const { rows } = await pool.query(
    `SELECT user_id, username, nickname, avatar_url, role, level,
            membership_type, membership_expire_time, create_time
     FROM users WHERE ${where}
     ORDER BY create_time DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM users WHERE ${where}`,
    params
  );

  return {
    users: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function updateUserRole(userId, role) {
  const validRoles = ["user", "admin"];
  if (!validRoles.includes(role)) {
    throw { status: 400, message: "无效的角色" };
  }

  const { rowCount } = await pool.query(
    "UPDATE users SET role = $1 WHERE user_id = $2 AND is_deleted = FALSE",
    [role, userId]
  );
  if (rowCount === 0) {
    throw { status: 404, message: "用户不存在" };
  }
}

async function listAllSongs({ search, status, offset = 0, limit = 20 }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(song_name ILIKE $${idx} OR singer ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`status = $${idx}`);
    params.push(status);
    idx++;
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const { rows } = await pool.query(
    `SELECT song_id, song_name, song_name_cn, singer, album, difficulty,
            audio_url, cover_url, is_public, status, play_count, create_user, create_time
     FROM songs ${where}
     ORDER BY create_time DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM songs ${where}`,
    params
  );

  return {
    songs: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

async function updateSong(songId, data) {
  const allowedFields = ["song_name", "song_name_cn", "singer", "album", "difficulty", "is_public", "status"];
  const sets = [];
  const params = [];
  let idx = 1;

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      params.push(data[field]);
    }
  }

  if (sets.length === 0) {
    throw { status: 400, message: "没有可更新的字段" };
  }

  params.push(songId);
  const { rowCount } = await pool.query(
    `UPDATE songs SET ${sets.join(", ")} WHERE song_id = $${idx}`,
    params
  );
  if (rowCount === 0) {
    throw { status: 404, message: "歌曲不存在" };
  }
}

async function deleteSong(songId) {
  const { rowCount } = await pool.query(
    "UPDATE songs SET status = 'offline' WHERE song_id = $1",
    [songId]
  );
  if (rowCount === 0) {
    throw { status: 404, message: "歌曲不存在" };
  }
}

async function listAllSuggestions({ status = "pending", offset = 0, limit = 20 }) {
  const { rows } = await pool.query(
    `SELECT ls.*, s.song_name, s.singer
     FROM lyrics_suggestions ls
     LEFT JOIN songs s ON ls.song_id = s.song_id
     WHERE ls.status = $1
     ORDER BY ls.created_at DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );

  const countResult = await pool.query(
    "SELECT COUNT(*) FROM lyrics_suggestions WHERE status = $1",
    [status]
  );

  return {
    suggestions: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

module.exports = {
  listUsers,
  updateUserRole,
  listAllSongs,
  updateSong,
  deleteSong,
  listAllSuggestions,
};
