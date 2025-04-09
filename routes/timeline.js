const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middlewares/auth');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取照片时间轴 - GET /timeline
router.get('/', photoController.getTimeline);

module.exports = router;