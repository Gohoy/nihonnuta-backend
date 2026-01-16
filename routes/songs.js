const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../controllers/songs.controller");
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), controller.uploadSong);
router.get("/search", controller.searchSongs);
router.get("/page", controller.getSongs);

router.get("/:id", controller.getSong);
router.post("/:id/play", controller.playSong);
router.post("/", controller.createSong);

module.exports = router;
