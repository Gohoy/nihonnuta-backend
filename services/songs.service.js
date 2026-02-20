const pool = require("../db/pool");
const cosService = require("./cos.service");

/* Create */
async function createSong(song) {
  const sql = `
    INSERT INTO songs (
      song_id,
      song_name,
      song_name_cn,
      singer,
      album,
      difficulty,
      audio_url,
      cover_url,
      lyrics_text,
      lyrics,
      is_public,
      status,
      create_user
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `;
  await pool.query(sql, [
    song.song_id,
    song.song_name,
    song.song_name_cn || "",
    song.singer,
    song.album || "",
    song.difficulty,
    song.audio_url,
    song.cover_url || "",
    song.lyrics_text || "",
    song.lyrics ? (() => {
      try {
        const jsonStr = JSON.stringify(song.lyrics);
        // JSONB字段理论上没有长度限制，但为了安全，限制为1MB
        return jsonStr.length > 1048576 ? JSON.stringify({}) : jsonStr;
      } catch (e) {
        console.error('JSON序列化失败:', e);
        return null;
      }
    })() : null,
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
  
  // 检查是否有日语歌词（至少需要原歌词）
  if (!lyricData?.lrc?.lyric && !lyricData?.romalrc?.lyric) {
    throw new Error("该歌曲没有歌词数据，无法导入");
  }
  
  // 如果没有罗马音，给出警告但不阻止导入
  if (!lyricData?.romalrc?.lyric) {
    console.warn("警告：该歌曲没有罗马音歌词，但可以导入");
  }
  
  // 获取音频URL（从netease API）
  // 注意：由于数据库audio_url字段限制为VARCHAR(255)，使用较短的备用URL
  // 如果需要使用真实URL，请先执行数据库迁移将audio_url改为TEXT类型
  let audioUrl = `https://music.163.com/song/media/outer/url?id=${neteaseSongId}.mp3`;
  
  // 可选：尝试获取真实URL（但可能超过255字符）
  // try {
  //   const audioUrlData = await neteaseService.getSongUrl(neteaseSongId);
  //   const realUrl = audioUrlData?.data?.[0]?.url || "";
  //   // 只有当URL不超过255字符时才使用
  //   if (realUrl && realUrl.length <= 255) {
  //     audioUrl = realUrl;
  //   }
  // } catch (error) {
  //   console.warn("获取音频URL失败，使用备用URL:", error.message);
  // }
  
  // 构建完整的歌词数据（包括原歌词、翻译、罗马音）
  // 注意：限制歌词长度以避免JSON序列化后过大
  const maxLyricLength = 10000; // 限制单段歌词最大长度
  const truncateLyric = (lyric) => {
    if (!lyric) return "";
    return lyric.length > maxLyricLength ? lyric.substring(0, maxLyricLength) : lyric;
  };
  
  const lyricsData = {
    lrc: {
      lyric: truncateLyric(lyricData.lrc?.lyric || ""),
    },
    tlyric: {
      lyric: truncateLyric(lyricData.tlyric?.lyric || ""),
    },
    romalrc: {
      lyric: truncateLyric(lyricData.romalrc?.lyric || ""),
    },
  };
  
  // 辅助函数：截断字符串到指定长度
  const truncate = (str, maxLength) => {
    if (!str) return "";
    return str.length > maxLength ? str.substring(0, maxLength) : str;
  };
  
  // 构建歌曲数据（注意字段长度限制）
  const songData = {
    song_id: String(neteaseSongId).substring(0, 64), // VARCHAR(64)
    song_name: truncate(song.name || "", 100), // VARCHAR(100)
    song_name_cn: truncate(options.song_name_cn || "", 100), // VARCHAR(100)
    singer: truncate(song.ar?.map((a) => a.name).join(" / ") || "", 100), // VARCHAR(100)
    album: truncate(song.al?.name || "", 100), // VARCHAR(100)
    difficulty: String(options.difficulty || 3).substring(0, 10), // VARCHAR(10)
    audio_url: audioUrl, // 已确保使用较短的备用URL
    cover_url: truncate((song.al?.picUrl || "").replace(/^http:\/\//, "https://"), 255),
    lyrics_text: lyricData.lrc?.lyric || "", // TEXT类型，无长度限制
    lyrics: lyricsData, // JSONB类型，无长度限制
    is_public: options.is_public !== undefined ? options.is_public : true,
    status: "published".substring(0, 20), // VARCHAR(20)
    create_user: options.create_user ? String(options.create_user).substring(0, 64) : null, // VARCHAR(64)
  };
  
  // 调试：检查字段长度
  console.log("Song data lengths:", {
    song_id: songData.song_id.length,
    song_name: songData.song_name.length,
    singer: songData.singer.length,
    album: songData.album.length,
    difficulty: songData.difficulty.length,
    audio_url: songData.audio_url.length,
    cover_url: songData.cover_url.length,
    status: songData.status.length,
    create_user: songData.create_user?.length || 0,
  });
  
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
        lyrics = $10,
        is_public = $11,
        status = $12,
        create_user = $13
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
      songData.lyrics ? (() => {
        try {
          const jsonStr = JSON.stringify(songData.lyrics);
          return jsonStr.length > 1048576 ? JSON.stringify({}) : jsonStr;
        } catch (e) {
          console.error('JSON序列化失败:', e);
          return null;
        }
      })() : null,
      songData.is_public,
      songData.status,
      songData.create_user,
    ]);
    // 异步下载音频到 MinIO（不阻塞响应）
    downloadAndCacheAudio(neteaseSongId).catch(e => console.warn("自动下载音频失败:", e.message));
    return {
      song: rows[0],
      imported: true,
      message: "歌曲已更新",
    };
  } else {
    // 创建新歌曲
    try {
      await createSong(songData);
      const newSong = await getSongById(neteaseSongId);
      // 异步下载音频到 MinIO（不阻塞响应）
      downloadAndCacheAudio(neteaseSongId).catch(e => console.warn("自动下载音频失败:", e.message));
      return {
        song: newSong,
        imported: true,
        message: "歌曲导入成功",
      };
    } catch (error) {
      // 如果是字段长度错误，尝试自动修复数据库schema
      if (error.message && error.message.includes('value too long for type character varying(255)')) {
        console.warn('检测到字段长度限制错误，尝试自动修复...');
        try {
          // 尝试修改audio_url和cover_url字段为TEXT类型
          await pool.query('ALTER TABLE songs ALTER COLUMN audio_url TYPE TEXT');
          await pool.query('ALTER TABLE songs ALTER COLUMN cover_url TYPE TEXT');
          console.log('✅ 数据库字段已自动修复，重试导入...');
          // 重试导入
          await createSong(songData);
          const newSong = await getSongById(neteaseSongId);
          return {
            song: newSong,
            imported: true,
            message: "歌曲导入成功（已自动修复数据库）",
          };
        } catch (migrationError) {
          console.error('自动修复失败:', migrationError.message);
          // 如果自动修复失败，使用截断的URL重试
          console.log('尝试使用截断的URL重试...');
          songData.audio_url = truncate(audioUrl, 255);
          songData.cover_url = truncate((song.al?.picUrl || "").replace(/^http:\/\//, "https://"), 255);
          await createSong(songData);
          const newSong = await getSongById(neteaseSongId);
          return {
            song: newSong,
            imported: true,
            message: "歌曲导入成功（已使用截断的URL）",
          };
        }
      }
      // 输出详细的错误信息以便调试
      console.error("创建歌曲失败，字段长度检查:", {
        song_id: songData.song_id?.length || songData.song_id,
        song_name: songData.song_name?.length,
        song_name_cn: songData.song_name_cn?.length,
        singer: songData.singer?.length,
        album: songData.album?.length,
        difficulty: songData.difficulty?.length || songData.difficulty,
        audio_url: songData.audio_url?.length,
        cover_url: songData.cover_url?.length,
      });
      throw error;
    }
  }
}

/**
 * 更新歌曲音频 URL（上传后持久化存储路径）
 */
async function updateSongAudioUrl(songId, audioUrl) {
  const sql = `UPDATE songs SET audio_url = $1 WHERE song_id = $2 RETURNING *`;
  const { rows } = await pool.query(sql, [audioUrl, songId]);
  return rows[0];
}

/**
 * 获取歌曲音频的新鲜预签名 URL
 */
async function getFreshAudioUrl(songId) {
  const song = await getSongById(songId);
  if (!song) return null;

  // audio_url stores the MinIO object path like "songId/filename.mp3"
  // or a full external URL (e.g. netease)
  const audioUrl = song.audio_url || '';
  if (!audioUrl) return null;

  // If it's an external URL (not a MinIO path), return as-is
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }

  // Generate fresh presigned URL from MinIO
  const url = await cosService.getObjectUrl('songs', audioUrl);
  return url;
}

/**
 * 从网易云下载音频并缓存到 MinIO
 * @param {string} songId - 歌曲 ID（网易云 ID）
 * @returns {{ objectName: string, size: number } | null}
 */
async function downloadAndCacheAudio(songId) {
  const neteaseService = require("./netease.service");

  // 1. 获取下载 URL（优先高品质下载，回退到流媒体URL）
  let downloadUrl = null;
  try {
    const data = await neteaseService.getSongDownloadUrl(songId);
    downloadUrl = data?.data?.url;
  } catch (e) {
    console.warn(`获取下载URL失败(songId=${songId}):`, e.message);
  }

  if (!downloadUrl) {
    // 回退到 /song/url（流媒体质量，但对VIP歌曲也能获取）
    try {
      const data = await neteaseService.getSongUrl(songId);
      downloadUrl = data?.data?.[0]?.url;
    } catch (e) {
      console.warn(`获取流媒体URL也失败(songId=${songId}):`, e.message);
    }
  }

  if (!downloadUrl) {
    console.warn(`歌曲 ${songId} 无可用下载URL`);
    return null;
  }

  // 2. 下载音频文件
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    console.warn(`下载音频失败(songId=${songId}): HTTP ${res.status}`);
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length < 1024) {
    console.warn(`音频文件过小(songId=${songId}): ${buffer.length} bytes`);
    return null;
  }

  // 3. 上传到 MinIO
  const contentType = res.headers.get("content-type") || "audio/mpeg";
  const ext = contentType.includes("flac") ? "flac" : "mp3";
  const objectName = `${songId}/${songId}.${ext}`;

  await cosService.uploadObject("songs", objectName, {
    buffer,
    size: buffer.length,
    mimetype: contentType,
  });

  // 4. 更新数据库
  await updateSongAudioUrl(songId, objectName);
  console.log(`歌曲 ${songId} 音频已缓存: ${objectName} (${(buffer.length / 1024).toFixed(0)}KB)`);

  return { objectName, size: buffer.length };
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
  updateSongAudioUrl,
  getFreshAudioUrl,
  downloadAndCacheAudio,
};
