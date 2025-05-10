const Album = require('../../models/Album');
const Photo = require('../../models/Photo');

/**
 * 创建新相册
 */
async function createAlbum(req, res, next) {
  try {
    const { name, description, coverPhotoId } = req.body;
    
    // 验证必须提供名称
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        message: '必须提供有效的相册名称'
      });
    }
    
    // 检查是否已存在同名相册
    const existingAlbum = await Album.findOne({ name, user: req.user.id });
    if (existingAlbum) {
      return res.status(409).json({
        message: '已存在同名相册，请使用其他名称'
      });
    }
    
    // 创建新相册
    const album = new Album({
      name,
      description,
      coverPhotoId: coverPhotoId || null,
      user: req.user.id,
      photos: []
    });
    
    // 保存相册
    await album.save();
    
    // 如果指定了封面照片，确保它存在
    if (coverPhotoId) {
      const photo = await Photo.findOne({ _id: coverPhotoId, user: req.user.id });
      if (photo) {
        // 将相册ID添加到照片的albums数组中
        if (!photo.albums.includes(album._id)) {
          photo.albums.push(album._id);
          await photo.save();
        }
      }
    }
    
    // 返回创建的相册
    res.status(201).json(album);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: '相册数据无效',
        details: error.message
      });
    }
    next(error);
  }
}

module.exports = createAlbum;
