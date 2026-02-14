const express = require("express");
const router = express.Router();
const controller = require("../controllers/learning.controller");

router.post("/record", controller.recordLearning);
router.get("/recent", controller.getRecentLearned);

module.exports = router;
