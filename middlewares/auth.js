const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

// 验证用户是否已登录
const authenticate = async (req, res, next) => {
  try {
    // 从请求头或cookie中获取token
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '用户未认证，请登录'
      });
    }
    
    // 验证token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // 在请求中添加用户信息
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户不存在或已被删除'
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: '无效的身份验证凭证'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: '身份验证已过期，请重新登录'
      });
    }
    
    next(error);
  }
};

module.exports = { authenticate };