const pool = require("../db/pool");

async function upsertLearningRecord(userId, songId) {
  const sql = `
    INSERT INTO user_learning_records (user_id, song_id, learn_progress, learn_time, master_rate)
    VALUES ($1, $2, 0, 1, 0)
    ON CONFLICT (user_id, song_id, learn_date)
    DO UPDATE SET learn_time = user_learning_records.learn_time + 1
  `;
  await pool.query(sql, [userId, songId]);
}

async function getRecentLearnedSongs(userId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT s.*, MAX(r.create_time) as last_learn_time
     FROM user_learning_records r
     JOIN songs s ON r.song_id = s.song_id
     WHERE r.user_id = $1
       AND (s.is_public = TRUE OR s.create_user = $1)
     GROUP BY s.song_id
     ORDER BY last_learn_time DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

module.exports = {
  upsertLearningRecord,
  getRecentLearnedSongs,
};
