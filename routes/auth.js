const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

// 无需鉴权
router.post('/auth/wxLogin', authController.wxLogin);

// 需要鉴权
router.get('/auth/logout', authMiddleware, authController.logout);
router.get('/user/info', authMiddleware, authController.getUserInfo);
router.post('/user/updateInfo', authMiddleware, authController.updateUserInfo);

module.exports = router;
