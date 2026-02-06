const pool = require("../db/pool");
const cosService = require("./cos.service");

/* Create */
async function createSong(song) {
  const sql = `
    INSERT INTO songs (
      song_id,
      song_name,
      singer,
      difficulty,
      audio_url,
      cover_url,
      lyrics_text,
      is_public,
      status,
      create_user
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;
  await pool.query(sql, [
    song.song_id,
    song.song_name,
    song.singer,
    song.difficulty,
    song.audio_url,
    song.cover_url || "",
    song.lyrics_text || "",
    song.is_public !== undefined ? song.is_public : true,
    song.status || "published",
    song.create_user || null,
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
    "SELECT * FROM songs WHERE status = 'published' AND is_public = TRUE ORDER BY create_time DESC OFFSET $1 LIMIT $2",
    [offset, limit]
  );
  const count = await pool.query(
    "SELECT COUNT(*) FROM songs WHERE status = 'published' AND is_public = TRUE"
  );
  return {
    songs: rows,
    total: parseInt(count.rows[0].count, 10),
  };
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
         WHERE (song_name ILIKE $1 OR singer ILIKE $1)
         AND status = 'published'
         AND is_public = TRUE
         ORDER BY create_time DESC 
         OFFSET $2 LIMIT $3`,
    [searchPattern, offset, limit]
  );
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM songs 
         WHERE (song_name ILIKE $1 OR singer ILIKE $1)
         AND status = 'published'
         AND is_public = TRUE`,
    [searchPattern]
  );
  return {
    songs: rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

// 热门歌曲
async function getPopularSongs(limit = 10) {
  const { rows } = await pool.query(
    "SELECT * FROM songs WHERE status = 'published' AND is_public = TRUE ORDER BY COALESCE(play_count, 0) DESC, create_time DESC LIMIT $1",
    [limit]
  );
  return rows;
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
  getPopularSongs,
  uploadSong,
};
