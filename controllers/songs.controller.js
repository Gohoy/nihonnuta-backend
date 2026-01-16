const songService = require("../services/songs.service");
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

module.exports = {
  getSong,
  playSong,
  createSong,
  getSongs,
  searchSongs,
  uploadSong,
};
