const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: '7d' // 令牌7天内有效
  });
};

// 用户注册
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        code: 409,
        message: '该邮箱已被注册'
      });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        code: 409,
        message: '该用户名已被使用'
      });
    }

    // 创建新用户
    const newUser = new User({
      username,
      email,
      password
    });

    // 保存用户到数据库
    await newUser.save();

    // 生成JWT令牌
    const token = generateToken(newUser._id);

    // 准备返回用户数据（不包括密码）
    const userData = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt
    };

    // 返回成功响应
    res.status(201).json({
      token,
      user: userData
    });
    
  } catch (error) {
    next(error);
  }
};

// 用户登录
exports.login = async (req, res, next) => {
  try {
    const { emailOrUsername, password } = req.body;

    // 查找用户
    let user;
    if (emailOrUsername.includes('@')) {
      // 通过邮箱查找
      user = await User.findOne({ email: emailOrUsername });
    } else {
      // 通过用户名查找
      user = await User.findOne({ username: emailOrUsername });
    }

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码不正确' // 修改：更新错误消息
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码不正确' // 修改：更新错误消息
      });
    }

    // 生成JWT令牌
    const token = generateToken(user._id);

    // 准备返回用户数据（不包括密码）
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // 返回成功响应
    res.status(200).json({
      token,
      user: userData
    });

  } catch (error) {
    next(error);
  }
};

// 获取当前用户信息
exports.getMe = async (req, res, next) => {
  try {
    // 用户信息已经由认证中间件添加到req对象中
    const user = req.user;

    // 返回用户信息
    res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
    
  } catch (error) {
    next(error);
  }
};