const mongoose = require('mongoose');
const Photo = require('../../models/Photo');

/**
 * 获取单个照片详情
 */
async function getPhotoById(req, res, next) {
  try {
    const { photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 查找照片
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
    
    // 返回照片详情
    res.status(200).json(photo);
  } catch (error) {
    next(error);
  }
}

module.exports = getPhotoById;
