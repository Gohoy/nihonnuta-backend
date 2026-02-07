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

// 从网易云导入歌曲
async function importSongFromNetease(neteaseSongId, options = {}) {
  const neteaseService = require("./netease.service");
  
  // 检查歌曲是否已存在
  const existingSong = await pool.query(
    "SELECT * FROM songs WHERE song_id = $1",
    [neteaseSongId]
  );
  
  if (existingSong.rows.length > 0 && !options.force) {
    return {
      song: existingSong.rows[0],
      imported: false,
      message: "歌曲已存在",
    };
  }
  
  // 获取歌曲详情和歌词
  const [songDetail, lyricData] = await Promise.all([
    neteaseService.getSongDetail(neteaseSongId),
    neteaseService.getLyric(neteaseSongId),
  ]);
  
  const song = songDetail?.songs?.[0];
  if (!song) {
    throw new Error("未找到歌曲信息");
  }
  
  // 检查是否有日语歌词（罗马音）
  if (!lyricData?.romalrc?.lyric) {
    throw new Error("该歌曲没有日语歌词，无法导入");
  }
  
  // 获取音频URL（从netease API）
  let audioUrl = "";
  try {
    const audioUrlData = await neteaseService.getSongUrl(neteaseSongId);
    audioUrl = audioUrlData?.data?.[0]?.url || "";
    
    // 如果URL为空，尝试使用备用方案
    if (!audioUrl) {
      audioUrl = `https://music.163.com/song/media/outer/url?id=${neteaseSongId}.mp3`;
    }
  } catch (error) {
    console.warn("获取音频URL失败:", error.message);
    // 如果无法获取音频URL，使用占位符
    audioUrl = `https://music.163.com/song/media/outer/url?id=${neteaseSongId}.mp3`;
  }
  
  if (!audioUrl) {
    throw new Error("无法获取音频URL");
  }
  
  // 构建歌曲数据
  const songData = {
    song_id: neteaseSongId,
    song_name: song.name || "",
    song_name_cn: options.song_name_cn || "",
    singer: song.ar?.map((a) => a.name).join(" / ") || "",
    album: song.al?.name || "",
    difficulty: options.difficulty || 3,
    audio_url: audioUrl,
    cover_url: song.al?.picUrl || "",
    lyrics_text: lyricData.lrc?.lyric || "",
    is_public: options.is_public !== undefined ? options.is_public : true,
    status: "published",
    create_user: options.create_user || null,
  };
  
  // 保存到数据库
  if (existingSong.rows.length > 0 && options.force) {
    // 更新现有歌曲
    const updateSql = `
      UPDATE songs SET
        song_name = $2,
        song_name_cn = $3,
        singer = $4,
        album = $5,
        difficulty = $6,
        audio_url = $7,
        cover_url = $8,
        lyrics_text = $9,
        is_public = $10,
        status = $11,
        create_user = $12
      WHERE song_id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(updateSql, [
      songData.song_id,
      songData.song_name,
      songData.song_name_cn,
      songData.singer,
      songData.album,
      songData.difficulty,
      songData.audio_url,
      songData.cover_url,
      songData.lyrics_text,
      songData.is_public,
      songData.status,
      songData.create_user,
    ]);
    return {
      song: rows[0],
      imported: true,
      message: "歌曲已更新",
    };
  } else {
    // 创建新歌曲
    await createSong(songData);
    const newSong = await getSongById(neteaseSongId);
    return {
      song: newSong,
      imported: true,
      message: "歌曲导入成功",
    };
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
  importSongFromNetease,
};
