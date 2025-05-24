const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('./config/config');

// 引入API路由
const apiRoutes = require('./api');
const { ensureBucketExists } = require('./utils/oss');

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 配置静态文件服务
// 生产环境主要通过OSS访问，但本地备份也可用作过渡期访问
// 这样在照片上传后，即使OSS处理尚未完成，前端也可以立即显示照片
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

// 初始化OSS配置并启动服务器
(async () => {
  try {
    // 确保OSS Bucket存在
    if (process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET && process.env.OSS_BUCKET) {
      console.log('正在验证OSS配置...');
      await ensureBucketExists();
      console.log('OSS配置验证完成');
    } else {
      console.warn('警告: 未配置OSS环境变量，文件上传功能可能无法正常工作');
    }

    // 启动服务器
    app.listen(config.PORT, () => {
      console.log(`服务器运行在 http://localhost:${config.PORT}`);
    });
  } catch (error) {
    console.error('初始化OSS失败:', error);
    console.error('服务器启动中止');
    process.exit(1);
  }
})();