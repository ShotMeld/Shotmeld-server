const Album = require('../../models/Album');
const mongoose = require('mongoose');

/**
 * 获取单个相册详情
 */
async function getAlbumById(req, res, next) {
  try {
    const { albumId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 返回相册详情
    res.status(200).json(album);
  } catch (error) {
    next(error);
  }
}

module.exports = getAlbumById;
