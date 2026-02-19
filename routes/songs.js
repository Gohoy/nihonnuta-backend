const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../controllers/songs.controller");
const suggestionsController = require("../controllers/suggestions.controller");
const authMiddleware = require("../middlewares/auth");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), controller.uploadSong);
router.get("/search", controller.searchSongs);
router.get("/page", controller.getSongs);
router.get("/popular", controller.getPopularSongs);
router.get("/netease/search", controller.searchNeteaseSongs);
router.get("/netease/lyric", controller.getNeteaseLyric);
router.get("/netease/processed", controller.getProcessedNeteaseLyric);
router.get("/netease/song", controller.getNeteaseSongDetail);
router.get("/processed", controller.getProcessedSongLyrics);
router.get("/vocabulary", controller.getSongVocabulary);

router.post("/import/netease", controller.importFromNetease);
// Suggestions routes (must be before /:id to avoid conflicts)
router.post("/suggestions/:suggestionId/review", authMiddleware, suggestionsController.reviewSuggestion);
router.post("/:id/suggestions", authMiddleware, suggestionsController.submitSuggestion);
router.get("/:id/suggestions", authMiddleware, suggestionsController.getSuggestions);
router.get("/:id/audio", controller.getSongAudio);
router.get("/:id", controller.getSong);
router.post("/:id/play", controller.playSong);
router.post("/", controller.createSong);

module.exports = router;
