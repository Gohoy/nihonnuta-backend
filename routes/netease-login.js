const express = require("express");
const router = express.Router();
const controller = require("../controllers/netease-login.controller");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

router.get("/login/status", authMiddleware, adminMiddleware, controller.loginStatus);
router.get("/login/qr/key", authMiddleware, adminMiddleware, controller.qrKey);
router.get("/login/qr/create", authMiddleware, adminMiddleware, controller.qrCreate);
router.get("/login/qr/check", authMiddleware, adminMiddleware, controller.qrCheck);

module.exports = router;
