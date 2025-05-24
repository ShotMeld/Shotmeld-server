const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const authRoutes = require('./auth/routes');
const albumRoutes = require('./albums/routes');
const photoRoutes = require('./photos/routes');
const timelineRoutes = require('./photos/timeline-routes');
const tagRoutes = require('./tags/routes');
const webhookRoutes = require('./webhook/routes');

// 注册路由
router.use('/auth', authRoutes);
router.use('/albums', albumRoutes);
router.use('/photos', photoRoutes);
router.use('/timeline', timelineRoutes);
router.use('/tags', tagRoutes);
router.use('/webhook', webhookRoutes);

module.exports = router;
