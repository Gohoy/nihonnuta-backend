const express = require("express");
const router = express.Router();
const controller = require("../controllers/learning.controller");
const authMiddleware = require("../middlewares/auth");

router.post("/record", authMiddleware, controller.recordLearning);
router.get("/recent", authMiddleware, controller.getRecentLearned);

module.exports = router;
