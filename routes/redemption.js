const express = require("express");
const router = express.Router();
const controller = require("../controllers/redemption.controller");
const guard = require("../middlewares/guard");

// User: redeem a code
router.post("/redeem", guard(), controller.redeemCode);

// Admin: generate codes
router.post("/generate", guard({ role: "admin" }), controller.generateCodes);

// Admin: list codes
router.get("/codes", guard({ role: "admin" }), controller.listCodes);

// Admin: disable a code
router.put("/codes/:id/disable", guard({ role: "admin" }), controller.disableCode);

module.exports = router;
