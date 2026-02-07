const express = require("express");
const router = express.Router();
const controller = require("../controllers/wordbook.controller");

router.post("/", controller.addWord);
router.get("/", controller.getWordbook);
router.get("/stats", controller.getWordbookStats);
router.put("/status", controller.updateWordStatus);
router.put("/note", controller.updateWordNote);
router.delete("/:id", controller.removeWord);

module.exports = router;

