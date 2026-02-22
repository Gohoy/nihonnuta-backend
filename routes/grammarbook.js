const express = require("express");
const router = express.Router();
const controller = require("../controllers/grammarbook.controller");
const guard = require("../middlewares/guard");

router.post("/", guard(), controller.addGrammar);
router.get("/", guard(), controller.getGrammarBook);
router.get("/stats", guard(), controller.getGrammarBookStats);
router.get("/review", guard(), controller.getReviewGrammars);
router.post("/review", guard(), controller.submitGrammarReview);
router.put("/status", guard(), controller.updateGrammarStatus);
router.put("/note", guard(), controller.updateGrammarNote);
router.delete("/:id", guard(), controller.removeGrammar);

module.exports = router;
