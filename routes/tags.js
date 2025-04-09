const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { authenticate } = require('../middlewares/auth');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取所有标签 - GET /tags
router.get('/', tagController.getAllTags);

// 获取带有指定标签的照片 - GET /tags/:tagId
router.get('/:tagId', tagController.getPhotosByTag);

module.exports = router;