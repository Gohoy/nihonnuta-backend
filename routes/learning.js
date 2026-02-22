const express = require("express");
const router = express.Router();
const controller = require("../controllers/learning.controller");
const guard = require("../middlewares/guard");

router.post("/record", guard(), controller.recordLearning);
router.get("/recent", guard(), controller.getRecentLearned);

module.exports = router;
