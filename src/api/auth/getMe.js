/**
 * 获取当前用户信息，包括照片总数和相册总数
 */
const Photo = require('../../models/Photo');
const Album = require('../../models/Album');

async function getMe(req, res, next) {
  try {
    // 用户信息已经由认证中间件添加到req对象中
    const user = req.user;
    const userId = user._id;

    // 获取用户照片总数
    const photoCount = await Photo.countDocuments({ user: userId });
    
    // 获取用户相册总数
    const albumCount = await Album.countDocuments({ user: userId });
    
    // 获取用户信息
    const userInfo = user.toJSON();
    
    // 添加照片总数和相册总数
    userInfo.photoCount = photoCount;
    userInfo.albumCount = albumCount;

    // 返回用户信息
    res.status(200).json(userInfo);
    
  } catch (error) {
    next(error);
  }
}

module.exports = getMe;
