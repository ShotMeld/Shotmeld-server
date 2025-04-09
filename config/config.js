// 加载环境变量
require('dotenv').config();

module.exports = {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myapi',
    JWT_SECRET: process.env.JWT_SECRET || 'mysecretkey', // 后面做登录用
    PORT: process.env.PORT || 3000,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET
};
