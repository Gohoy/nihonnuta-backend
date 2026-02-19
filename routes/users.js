const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const suggestionsController = require("../controllers/suggestions.controller");
const authMiddleware = require("../middlewares/auth");

router.get("/info", authMiddleware, authController.getUserInfo);
router.put("/level", authMiddleware, authController.updateLevel);
router.get("/suggestions", authMiddleware, suggestionsController.getMySuggestions);

module.exports = router;
