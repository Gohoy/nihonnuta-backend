const express = require("express");
const router = express.Router();
const controller = require("../controllers/wordbook.controller");
const authMiddleware = require("../middlewares/auth");

router.post("/", authMiddleware, controller.addWord);
router.get("/", authMiddleware, controller.getWordbook);
router.get("/stats", authMiddleware, controller.getWordbookStats);
router.get("/review", authMiddleware, controller.getReviewWords);
router.post("/review", authMiddleware, controller.submitReview);
router.put("/status", authMiddleware, controller.updateWordStatus);
router.put("/note", authMiddleware, controller.updateWordNote);
router.delete("/:id", authMiddleware, controller.removeWord);

module.exports = router;
