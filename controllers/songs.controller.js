const songService = require("../services/songs.service");
const neteaseService = require("../services/netease.service");
const LyricsProcessor = require("../services/lyrics.service");

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
  await songService.createSong(req.body);
  return res.status(201).json({ success: true });
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
  return songService.uploadSong(req, res);
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
    const lyricsText = song.lyrics_text || "";
    if (lyricsText && lyricsText.trim()) {
      const processed = await processor.processLyricsText(lyricsText);
      return res.success(processed);
    }
    const lyricData = await neteaseService.getLyric(songId);
    const processed = await processor.processSongLyricsData(lyricData);
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

module.exports = {
  getSong,
  playSong,
  createSong,
  getSongs,
  getPopularSongs,
  searchSongs,
  uploadSong,
  searchNeteaseSongs,
  getNeteaseLyric,
  getNeteaseSongDetail,
  getProcessedSongLyrics,
  getProcessedNeteaseLyric,
};
