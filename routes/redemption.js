const express = require("express");
const router = express.Router();
const controller = require("../controllers/redemption.controller");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

// User: redeem a code
router.post("/redeem", authMiddleware, controller.redeemCode);

// Admin: generate codes
router.post("/generate", authMiddleware, adminMiddleware, controller.generateCodes);

// Admin: list codes
router.get("/codes", authMiddleware, adminMiddleware, controller.listCodes);

module.exports = router;
