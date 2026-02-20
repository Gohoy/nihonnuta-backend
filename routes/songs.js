const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../controllers/songs.controller");
const suggestionsController = require("../controllers/suggestions.controller");
const authMiddleware = require("../middlewares/auth");
const { optionalAuth } = require("../middlewares/auth");
const upload = multer({ storage: multer.memoryStorage() });

// 需要登录
router.post("/upload", authMiddleware, upload.single("file"), controller.uploadSong);
router.post("/import/netease", authMiddleware, controller.importFromNetease);
router.post("/:id/download-audio", authMiddleware, controller.downloadAudio);
router.post("/batch-download-audio", authMiddleware, controller.batchDownloadAudio);
router.post("/", authMiddleware, controller.createSong);

// 建议（需要登录）
router.post("/suggestions/:suggestionId/review", authMiddleware, suggestionsController.reviewSuggestion);
router.post("/:id/suggestions", authMiddleware, suggestionsController.submitSuggestion);
router.get("/:id/suggestions", authMiddleware, suggestionsController.getSuggestions);

// 公开读取
router.get("/search", controller.searchSongs);
router.get("/page", controller.getSongs);
router.get("/popular", controller.getPopularSongs);
router.get("/netease/search", controller.searchNeteaseSongs);
router.get("/netease/lyric", controller.getNeteaseLyric);
router.get("/netease/processed", controller.getProcessedNeteaseLyric);
router.get("/netease/song", controller.getNeteaseSongDetail);
router.get("/processed", optionalAuth, controller.getProcessedSongLyrics);
router.get("/vocabulary", optionalAuth, controller.getSongVocabulary);
router.get("/:id/audio", controller.getSongAudio);
router.get("/:id", controller.getSong);
router.post("/:id/play", controller.playSong);

module.exports = router;
