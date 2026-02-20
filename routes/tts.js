const express = require("express");
const router = express.Router();
const controller = require("../controllers/tts.controller");
const { optionalAuth } = require("../middlewares/auth");

router.get("/", optionalAuth, controller.getTTS);

module.exports = router;
