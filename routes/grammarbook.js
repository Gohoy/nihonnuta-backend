const express = require("express");
const router = express.Router();
const controller = require("../controllers/grammarbook.controller");

router.post("/", controller.addGrammar);
router.get("/", controller.getGrammarBook);
router.get("/stats", controller.getGrammarBookStats);
router.put("/status", controller.updateGrammarStatus);
router.put("/note", controller.updateGrammarNote);
router.delete("/:id", controller.removeGrammar);

module.exports = router;

