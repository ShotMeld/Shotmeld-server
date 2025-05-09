const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');

// 引入各个路由处理函数
const register = require('./register');
const login = require('./login');
const getMe = require('./getMe');

// 用户注册 - POST /auth/register
router.post('/register', register);

// 用户登录 - POST /auth/login
router.post('/login', login);

// 获取当前用户信息 - GET /auth/me
router.get('/me', authenticate, getMe);

module.exports = router;
