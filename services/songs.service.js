const pool = require("../db/pool");
const cosService = require("./cos.service");

/* Create */
async function createSong(song) {
  const sql = `
    INSERT INTO songs (song_id, song_name, singer, difficulty, audio_url, lyrics)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await pool.query(sql, [
    song.song_id,
    song.song_name,
    song.singer,
    song.difficulty,
    song.audio_url,
    song.lyrics,
  ]);
}

/* Read */
async function getSongById(songId) {
  const { rows } = await pool.query("SELECT * FROM songs WHERE song_id = $1", [
    songId,
  ]);
  return rows[0];
}
// 分页获取
async function getSongs(offset, limit) {
  if (!limit) {
    limit = 10;
  }

  const { rows } = await pool.query(
    "SELECT * FROM songs ORDER BY create_time DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );
  const count = await pool.query("SELECT COUNT(*) FROM songs");
  return rows, parseInt(count.rows[0].count, 10);
}

/* Update */
async function updatePlayCount(songId) {
  await pool.query(
    "UPDATE songs SET play_count = play_count + 1 WHERE song_id = $1",
    [songId]
  );
}

/* Delete（软删建议） */
async function hideSong(songId) {
  await pool.query("UPDATE songs SET status = $1 WHERE song_id = $2", [
    "offline",
    songId,
  ]);
}
// search
async function searchSongs(keywords, offset, limit) {
  const searchPattern = `%${keywords}%`;
  const { rows } = await pool.query(
    `SELECT * FROM songs 
         WHERE song_name ILIKE $1 OR singer ILIKE $1
         ORDER BY create_time DESC 
         OFFSET $2 LIMIT $3`,
    [searchPattern, offset, limit]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM songs 
         WHERE song_name ILIKE $1 OR singer ILIKE $1`,
    [searchPattern]
  );
  return {
    songs: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

// 上传歌曲接口
async function uploadSong(req, res) {
  try {
    const file = req.file;
    const songId = req.body.songId || Date.now().toString();
    const filename = req.body.filename || (file ? file.originalname : null);

    if (!file) {
      return res.status(400).json({ error: "请选择文件" });
    }

    // 构建存储路径: songs/{songId}/{filename}
    const objectName = `${songId}/${filename}`;
    const bucketName = "songs";

    // 上传到 MinIO
    await cosService.uploadObject(bucketName, objectName, file);

    // 获取访问 URL
    const url = await cosService.getObjectUrl(bucketName, objectName);

    res.json({
      success: true,
      data: {
        songId,
        filename: file.originalname,
        path: objectName,
        url,
        size: file.size,
      },
    });
  } catch (error) {
    console.error("上传失败:", error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  createSong,
  getSongById,
  updatePlayCount,
  hideSong,
  getSongs,
  searchSongs,
  uploadSong,
};
