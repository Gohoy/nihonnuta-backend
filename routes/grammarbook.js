const express = require("express");
const router = express.Router();
const controller = require("../controllers/grammarbook.controller");
const authMiddleware = require("../middlewares/auth");

router.post("/", authMiddleware, controller.addGrammar);
router.get("/", authMiddleware, controller.getGrammarBook);
router.get("/stats", authMiddleware, controller.getGrammarBookStats);
router.get("/review", authMiddleware, controller.getReviewGrammars);
router.post("/review", authMiddleware, controller.submitGrammarReview);
router.put("/status", authMiddleware, controller.updateGrammarStatus);
router.put("/note", authMiddleware, controller.updateGrammarNote);
router.delete("/:id", authMiddleware, controller.removeGrammar);

module.exports = router;
