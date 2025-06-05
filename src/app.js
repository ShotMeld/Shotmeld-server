const express = require('express');
const app = express();

// 导入路由
const duplicatesRouter = require('./routes/duplicates');

// ...existing middleware and route setups...

// 挂载相似照片检测路由到根路径
app.use('/', duplicatesRouter);

// ...existing error handling and server start logic...

module.exports = app;