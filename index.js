const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');

// 引入API路由
const apiRoutes = require('./api');

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 配置静态文件服务，提供对上传文件的访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 连接MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('MongoDB连接成功');
  })
  .catch(err => {
    console.error('MongoDB连接失败:', err);
    process.exit(1);
  });

// 路由注册
app.use('/', apiRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误'
  });
});

// 启动服务器
app.listen(config.PORT, () => {
  console.log(`服务器运行在 http://localhost:${config.PORT}`);
});