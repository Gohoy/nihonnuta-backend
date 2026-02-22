const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../controllers/songs.controller");
const suggestionsController = require("../controllers/suggestions.controller");
const guard = require("../middlewares/guard");
const upload = multer({ storage: multer.memoryStorage() });

// Admin only
router.post("/:id/download-audio", guard({ role: "admin" }), controller.downloadAudio);
router.post("/batch-download-audio", guard({ role: "admin" }), controller.batchDownloadAudio);

// Auth required
router.post("/upload", guard(), upload.single("file"), controller.uploadSong);
router.post("/import/netease", guard(), controller.importFromNetease);
router.post("/", guard(), controller.createSong);

// Suggestions (auth required)
router.post("/suggestions/:suggestionId/review", guard(), suggestionsController.reviewSuggestion);
router.post("/:id/suggestions", guard(), suggestionsController.submitSuggestion);
router.get("/:id/suggestions", guard(), suggestionsController.getSuggestions);

// Public / optional auth
router.get("/search", controller.searchSongs);
router.get("/page", controller.getSongs);
router.get("/popular", controller.getPopularSongs);
router.get("/netease/search", controller.searchNeteaseSongs);
router.get("/netease/lyric", controller.getNeteaseLyric);
router.get("/netease/processed", controller.getProcessedNeteaseLyric);
router.get("/netease/song", controller.getNeteaseSongDetail);
router.get("/processed", guard({ optional: true }), controller.getProcessedSongLyrics);
router.get("/vocabulary", guard({ optional: true }), controller.getSongVocabulary);
router.get("/:id/audio", controller.getSongAudio);
router.get("/:id", controller.getSong);
router.post("/:id/play", controller.playSong);

module.exports = router;
