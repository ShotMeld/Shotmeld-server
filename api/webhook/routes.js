const express = require('express');
const router = express.Router();
const handleWebhook = require('./handleWebhook');

// 接收Git仓库webhook请求的路由
router.post('/github', express.json(), handleWebhook);

module.exports = router;
