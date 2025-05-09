const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');

// 引入时间轴处理函数
const getTimeline = require('./getTimeline');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取照片时间轴 - GET /timeline
router.get('/', getTimeline);

module.exports = router;
