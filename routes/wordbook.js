const express = require("express");
const router = express.Router();
const controller = require("../controllers/wordbook.controller");
const guard = require("../middlewares/guard");

router.post("/", guard(), controller.addWord);
router.get("/", guard(), controller.getWordbook);
router.get("/stats", guard(), controller.getWordbookStats);
router.get("/review", guard(), controller.getReviewWords);
router.post("/review", guard(), controller.submitReview);
router.put("/status", guard(), controller.updateWordStatus);
router.put("/note", guard(), controller.updateWordNote);
router.delete("/:id", guard(), controller.removeWord);

module.exports = router;
