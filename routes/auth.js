const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

// 用户注册 - POST /auth/register
router.post('/register', authController.register);

// 用户登录 - POST /auth/login
router.post('/login', authController.login);

// 获取当前用户信息 - GET /auth/me
router.get('/me', authenticate, authController.getMe);

module.exports = router;