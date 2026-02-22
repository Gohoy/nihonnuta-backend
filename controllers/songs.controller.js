const songService = require("../services/songs.service");
const neteaseService = require("../services/netease.service");
const LyricsProcessor = require("../services/lyrics.service");
const vocabularyService = require("../services/vocabulary.service");

let lyricsProcessor;
async function getLyricsProcessor() {
  if (!lyricsProcessor) {
    lyricsProcessor = new LyricsProcessor();
    await lyricsProcessor.init();
  }
  return lyricsProcessor;
}
async function getSong(req, res) {
  const song = await songService.getSongById(req.params.id);
  if (!song) {
    return res.status(404).json({ message: "song not found" });
  }
  return res.success(song);
}

async function playSong(req, res) {
  await songService.updatePlayCount(req.params.id);
  return res.success({ success: true });
}

async function createSong(req, res) {
  try {
    await songService.createSong(req.body);
    return res.status(201).json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function importFromNetease(req, res) {
  try {
    const neteaseSongId = req.body.netease_song_id || req.query.id;
    if (!neteaseSongId) {
      return res.status(400).json({ message: "netease_song_id is required" });
    }
    
    const options = {
      difficulty: req.body.difficulty,
      is_public: req.body.is_public,
      create_user: req.body.create_user,
      song_name_cn: req.body.song_name_cn,
      force: req.body.force || false,
    };
    
    const result = await songService.importSongFromNetease(neteaseSongId, options);
    return res.success(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}
async function getSongs(req, res) {
  const offset = parseInt(req.query.offset, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 10;
  const { songs, total } = await songService.getSongs(offset, limit);
  return res.success({ songs, total });
}

async function getPopularSongs(req, res) {
  const limit = parseInt(req.query.limit, 10) || 10;
  const songs = await songService.getPopularSongs(limit);
  return res.success({ songs });
}

async function searchSongs(req, res) {
  const keywords = req.query.keywords || "";
  const offset = parseInt(req.query.offset, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 10;
  const result = await songService.searchSongs(keywords, offset, limit);
  return res.success(result);
}
async function uploadSong(req, res) {
  // uploadSong in service handles its own response, but we also persist the path
  const file = req.file;
  const songId = req.body.songId || Date.now().toString();
  const filename = req.body.filename || (file ? file.originalname : null);

  if (!file) {
    return res.status(400).json({ error: "请选择文件" });
  }

  try {
    const objectName = `${songId}/${filename}`;
    const bucketName = "songs";
    const cosService = require("../services/cos.service");
    await cosService.uploadObject(bucketName, objectName, file);
    const url = await cosService.getObjectUrl(bucketName, objectName);

    // Skip persisting audio_url when uploading as a suggestion
    const asSuggestion = req.body.asSuggestion === 'true';
    if (!asSuggestion) {
      await songService.updateSongAudioUrl(songId, objectName);
    }

    res.json({
      success: true,
      data: { songId, filename: file.originalname, path: objectName, url, size: file.size },
    });
  } catch (error) {
    console.error("上传失败:", error);
    res.status(500).json({ error: error.message });
  }
}

async function getSongAudio(req, res) {
  try {
    const songId = req.params.id;
    const url = await songService.getFreshAudioUrl(songId);
    if (!url) {
      return res.status(404).json({ message: "Audio not found" });
    }
    res.set("Cache-Control", "no-store");
    return res.success({ url });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function searchNeteaseSongs(req, res) {
  try {
    const keywords = req.query.keywords || "";
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const result = await neteaseService.searchSongs(keywords, limit, offset);
    return res.success(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function getNeteaseLyric(req, res) {
  try {
    const songId = req.query.id;
    if (!songId) {
      return res.status(400).json({ message: "id is required" });
    }
    const result = await neteaseService.getLyric(songId);
    return res.success(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function getNeteaseSongDetail(req, res) {
  try {
    const songId = req.query.id;
    if (!songId) {
      return res.status(400).json({ message: "id is required" });
    }
    const result = await neteaseService.getSongDetail(songId);
    return res.success(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function getProcessedSongLyrics(req, res) {
  try {
    const songId = req.query.id;
    const userId = req.query.user_id;
    if (!songId) {
      return res.status(400).json({ message: "id is required" });
    }
    const song = await songService.getSongById(songId);
    if (!song) {
      return res.status(404).json({ message: "song not found" });
    }
    if (song.is_public === false && song.create_user && userId !== song.create_user) {
      return res.status(403).json({ message: "permission denied" });
    }
    const processor = await getLyricsProcessor();
    const kanaOverrides = song.kana_overrides || {};
    // Prefer the lyrics JSONB (has lrc/tlyric/romalrc) over plain lyrics_text
    const lyricJsonb = song.lyrics;
    if (lyricJsonb && lyricJsonb.lrc && lyricJsonb.lrc.lyric) {
      const processed = await processor.processSongLyricsData(lyricJsonb, kanaOverrides);
      return res.success(processed);
    }
    const lyricsText = song.lyrics_text || "";
    if (lyricsText && lyricsText.trim()) {
      const processed = await processor.processLyricsText(lyricsText);
      return res.success(processed);
    }
    const lyricData = await neteaseService.getLyric(songId);
    const processed = await processor.processSongLyricsData(lyricData, kanaOverrides);
    return res.success(processed);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function getProcessedNeteaseLyric(req, res) {
  try {
    const songId = req.query.id;
    if (!songId) {
      return res.status(400).json({ message: "id is required" });
    }
    const lyricData = await neteaseService.getLyric(songId);
    const processor = await getLyricsProcessor();
    const processed = await processor.processSongLyricsData(lyricData);
    return res.success(processed);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function getSongVocabulary(req, res) {
  try {
    const songId = req.query.id;
    const userId = req.query.user_id;
    const level = req.query.level || "N5";
    if (!songId) {
      return res.status(400).json({ message: "id is required" });
    }
    const song = await songService.getSongById(songId);
    if (!song) {
      return res.status(404).json({ message: "song not found" });
    }
    // Process lyrics (same logic as getProcessedSongLyrics)
    const processor = await getLyricsProcessor();
    const kanaOverrides = song.kana_overrides || {};
    let processed;
    const lyricJsonb = song.lyrics;
    if (lyricJsonb && lyricJsonb.lrc && lyricJsonb.lrc.lyric) {
      processed = await processor.processSongLyricsData(lyricJsonb, kanaOverrides);
    } else {
      const lyricsText = song.lyrics_text || "";
      if (lyricsText && lyricsText.trim()) {
        processed = await processor.processLyricsText(lyricsText);
      } else {
        const lyricData = await neteaseService.getLyric(songId);
        processed = await processor.processSongLyricsData(lyricData, kanaOverrides);
      }
    }
    // Extract vocabulary
    const tagNumbers = vocabularyService.levelToTagNumbers(level);
    const allWords = processor.allWords || {};
    const allVocab = vocabularyService.extractVocabulary(processed, tagNumbers, allWords);
    // Filter out mastered words
    const masteredWords = await vocabularyService.getMasteredWords(userId);
    const vocabulary = allVocab.filter(
      (v) => !masteredWords.has(v.word) && !masteredWords.has(v.base_form)
    );
    // Group by JLPT level
    const grouped = {};
    for (const v of vocabulary) {
      const lvl = v.jlpt_level || "unknown";
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(v);
    }
    return res.success({
      vocabulary,
      grouped,
      total: vocabulary.length,
      level,
      mastered_count: allVocab.length - vocabulary.length,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ message: error.message });
  }
}

async function downloadAudio(req, res) {
  try {
    const songId = req.params.id;
    const result = await songService.downloadAndCacheAudio(songId);
    if (!result) {
      return res.status(404).json({ message: "无法下载该歌曲音频" });
    }
    return res.success(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function batchDownloadAudio(req, res) {
  try {
    // 查找所有使用外部URL的歌曲
    const pool = require("../db/pool");
    const { rows } = await pool.query(
      "SELECT song_id FROM songs WHERE audio_url LIKE 'http%' OR audio_url = '' OR audio_url IS NULL"
    );
    const results = { success: [], failed: [] };
    for (const row of rows) {
      try {
        const r = await songService.downloadAndCacheAudio(row.song_id);
        if (r) results.success.push(row.song_id);
        else results.failed.push({ id: row.song_id, reason: "无下载URL" });
      } catch (e) {
        results.failed.push({ id: row.song_id, reason: e.message });
      }
    }
    return res.success(results);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = {
  getSong,
  playSong,
  createSong,
  getSongs,
  getPopularSongs,
  searchSongs,
  uploadSong,
  getSongAudio,
  searchNeteaseSongs,
  getNeteaseLyric,
  getNeteaseSongDetail,
  getProcessedSongLyrics,
  getProcessedNeteaseLyric,
  importFromNetease,
  getSongVocabulary,
  downloadAudio,
  batchDownloadAudio,
};
