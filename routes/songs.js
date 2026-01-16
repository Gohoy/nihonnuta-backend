const express = require("express");
const router = express.Router();
const controller = require("../controllers/songs.controller");

router.get("/search", controller.searchSongs);
router.get("/page", controller.getSongs);

router.get("/:id", controller.getSong);
router.post("/:id/play", controller.playSong);
router.post("/", controller.createSong);
router.post("/upload", controller.uploadSong);

module.exports = router;
