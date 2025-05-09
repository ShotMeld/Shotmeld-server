/**
 * 获取当前用户信息
 */
async function getMe(req, res, next) {
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
}

module.exports = getMe;
