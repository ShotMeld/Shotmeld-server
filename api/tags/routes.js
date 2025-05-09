const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');

// 引入各个路由处理函数
const getAllTags = require('./getAllTags');
const getPhotosByTag = require('./getPhotosByTag');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取所有标签 - GET /tags
router.get('/', getAllTags);

// 获取带有指定标签的照片 - GET /tags/:tagId
router.get('/:tagId', getPhotosByTag);

module.exports = router;
