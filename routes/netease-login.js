const express = require("express");
const router = express.Router();
const controller = require("../controllers/netease-login.controller");
const guard = require("../middlewares/guard");

router.get("/login/status", guard({ role: "admin" }), controller.loginStatus);
router.get("/login/qr/key", guard({ role: "admin" }), controller.qrKey);
router.get("/login/qr/create", guard({ role: "admin" }), controller.qrCreate);
router.get("/login/qr/check", guard({ role: "admin" }), controller.qrCheck);

module.exports = router;
