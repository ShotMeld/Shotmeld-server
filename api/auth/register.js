const User = require('../../models/User');
const { generateToken } = require('./utils');

/**
 * 用户注册
 */
async function register(req, res, next) {
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
}

module.exports = register;
