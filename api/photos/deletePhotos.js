const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const { photoDir, thumbnailDir } = require('../../config/upload');

/**
 * 批量删除照片
 * 支持dryRun模式，可以只验证而不实际删除
 */
async function deletePhotos(req, res, next) {
  try {
    const { photoIds, dryRun = false } = req.body;
    
    // 验证必须提供photoIds参数
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        message: '参数错误：photoIds必须是一个非空数组'
      });
    }
    
    // 查找用户所有的照片
    const photos = await Photo.find({ 
      _id: { $in: photoIds },
      user: req.user.id
    });
    
    // 检查是否所有照片都找到了
    if (photos.length !== photoIds.length) {
      const foundIds = photos.map(photo => photo._id.toString());
      const missingIds = photoIds.filter(id => !foundIds.includes(id));
      
      return res.status(404).json({
        message: '部分照片不存在或无权限删除',
        details: missingIds
      });
    }
    
    // 如果是dryRun模式，到此为止，返回验证成功
    if (dryRun) {
      return res.status(200).json({
        message: '验证成功，所有照片都存在且有权限删除',
        count: photos.length,
        photos: photos.map(photo => ({
          id: photo._id,
          title: photo.title,
          thumbnailUrl: photo.thumbnailUrl
        }))
      });
    }
    
    // 实际执行删除操作
    for (const photo of photos) {
      // 从所有相册中移除此照片的引用
      await Album.updateMany(
        { photos: photo._id },
        { $pull: { photos: photo._id } }
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
    }
    
    // 批量删除照片记录
    await Photo.deleteMany({ _id: { $in: photoIds } });
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = deletePhotos;
