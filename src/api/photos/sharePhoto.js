const Photo = require('../../models/Photo');

/**
 * 设置照片为可分享状态
 * 该接口将图片标记为可以公开分享，无需认证即可访问
 */
async function sharePhoto(req, res, next) {
  try {
    const { photoId } = req.params;
    
    // 查找用户所拥有的照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      user: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 更新照片为可分享状态
    photo.isShared = true;
    photo.shareCreatedAt = new Date();
    await photo.save();
    
    // 返回分享信息
    res.status(200).json({
      code: 200,
      message: '照片已设置为可分享',
      data: {
        id: photo.id,
        isShared: photo.isShared,
        shareCreatedAt: photo.shareCreatedAt,
        shareUrl: `${req.protocol}://${req.get('host')}/api/photos/shared/${photo.id}`
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = sharePhoto;
