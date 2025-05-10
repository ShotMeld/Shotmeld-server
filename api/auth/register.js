const User = require('../../models/User');
const { generateToken } = require('./utils');

/**
 * 用户注册
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    // 验证请求字段
    if (!username || !email || !password) {
      return res.status(400).json({
        message: '用户名、邮箱和密码为必填项'
      });
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        message: '用户名长度必须在3-30个字符之间'
      });
    }

    // 验证密码长度
    if (password.length < 8) {
      return res.status(400).json({
        message: '密码长度必须至少为8个字符'
      });
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        code: 409,
        message: `邮箱 '${email}' 已被注册。`
      });
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({
        code: 409,
        message: `用户名 '${username}' 已被使用。`
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

    // 使用toJSON转换为标准格式
    const userData = newUser.toJSON();

    // 返回成功响应，符合AuthResponse模式
    res.status(201).json({
      token,
      user: userData
    });
    
  } catch (error) {
    next(error);
  }
}

module.exports = register;
