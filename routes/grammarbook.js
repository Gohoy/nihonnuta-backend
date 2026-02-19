const express = require("express");
const router = express.Router();
const controller = require("../controllers/grammarbook.controller");

router.post("/", controller.addGrammar);
router.get("/", controller.getGrammarBook);
router.get("/stats", controller.getGrammarBookStats);
router.get("/review", controller.getReviewGrammars);
router.post("/review", controller.submitGrammarReview);
router.put("/status", controller.updateGrammarStatus);
router.put("/note", controller.updateGrammarNote);
router.delete("/:id", controller.removeGrammar);

module.exports = router;

