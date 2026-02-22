const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const suggestionsController = require("../controllers/suggestions.controller");
const guard = require("../middlewares/guard");

router.get("/info", guard(), authController.getUserInfo);
router.put("/level", guard(), authController.updateLevel);
router.get("/suggestions", guard(), suggestionsController.getMySuggestions);

module.exports = router;
