const mongoose = require('mongoose');
const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const { photoDir, thumbnailDir } = require('../../config/upload');

/**
 * 删除照片
 */
async function deletePhoto(req, res, next) {
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
    
    // 从所有相册中移除此照片的引用
    await Album.updateMany(
      { photos: photoId },
      { $pull: { photos: photoId } }
    );
    
    // 删除文件系统中的照片文件和缩略图
    const photoPath = path.join(photoDir, photo.filename);
    const thumbnailFilename = `thumb_${photo.filename}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
    
    // 删除照片文件
    if (fs.existsSync(photoPath)) {
      await fs.unlink(photoPath);
    }
    
    // 删除缩略图文件
    if (fs.existsSync(thumbnailPath)) {
      await fs.unlink(thumbnailPath);
    }
    
    // 删除照片记录
    await Photo.deleteOne({ _id: photoId });
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = deletePhoto;
