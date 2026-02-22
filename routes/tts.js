const express = require("express");
const router = express.Router();
const controller = require("../controllers/tts.controller");
const guard = require("../middlewares/guard");

router.get("/", guard({ optional: true }), controller.getTTS);

module.exports = router;
