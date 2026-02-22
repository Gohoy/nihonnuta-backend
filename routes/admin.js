const express = require("express");
const router = express.Router();
const controller = require("../controllers/admin.controller");
const guard = require("../middlewares/guard");

// All admin routes require admin role
router.use(guard({ role: "admin" }));

// Users
router.get("/users", controller.listUsers);
router.put("/users/:id/role", controller.updateUserRole);

// Songs
router.get("/songs", controller.listSongs);
router.put("/songs/:id", controller.updateSong);
router.delete("/songs/:id", controller.deleteSong);

// Suggestions
router.get("/suggestions", controller.listSuggestions);
router.post("/suggestions/:id/review", controller.reviewSuggestion);

module.exports = router;
