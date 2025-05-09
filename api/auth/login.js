const User = require('../../models/User');
const { generateToken } = require('./utils');

/**
 * 用户登录
 */
async function login(req, res, next) {
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
        message: '用户名或密码不正确'
      });
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: '用户名或密码不正确'
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
}

module.exports = login;
