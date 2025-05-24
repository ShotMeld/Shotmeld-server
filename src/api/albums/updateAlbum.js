const Album = require('../../models/Album');
const Photo = require('../../models/Photo');

/**
 * 更新相册信息
 */
async function updateAlbum(req, res, next) {
  try {
    const { albumId } = req.params;
    const { name, description, coverPhotoId } = req.body;
    
    // 验证请求体不能为空
    if (!name && description === undefined && coverPhotoId === undefined) {
      return res.status(400).json({
        message: '请提供至少一个要更新的字段'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        message: '相册不存在'
      });
    }
    
    // 如果要更新名称，检查是否已存在同名相册
    if (name && name !== album.name) {
      const existingAlbum = await Album.findOne({ 
        name, 
        user: req.user.id,
        _id: { $ne: albumId }
      });
      
      if (existingAlbum) {
        return res.status(409).json({
          message: '已存在同名相册，请使用其他名称'
        });
      }
    }
    
    // 更新相册属性
    if (name) album.name = name;
    if (description !== undefined) album.description = description;
    
    // 如果更换了封面照片
    if (coverPhotoId !== undefined && coverPhotoId !== album.coverPhotoId) {
      // 设置新的封面照片
      album.coverPhotoId = coverPhotoId || null;
      
      // 如果指定了新的封面照片，确保照片存在并与相册关联
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
    }
    
    // 保存更新后的相册
    await album.save();
    
    // 返回更新后的相册
    res.status(200).json(album);
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

module.exports = updateAlbum;
