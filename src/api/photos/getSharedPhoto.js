const Photo = require('../../models/Photo');

/**
 * 获取共享照片详情，无需认证即可访问
 */
async function getSharedPhoto(req, res, next) {
  try {
    const { photoId } = req.params;
    
    // 查找已标记为共享的照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      isShared: true  // 只查找被标记为共享的照片
    });
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '共享照片不存在或未设置为共享'
      });
    }
    
    // 返回照片详情
    res.status(200).json(photo);
  } catch (error) {
    next(error);
  }
}

module.exports = getSharedPhoto;
