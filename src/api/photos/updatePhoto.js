const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const Tag = require('../../models/Tag');

/**
 * 更新照片信息
 */
async function updatePhoto(req, res, next) {
  try {
    const { photoId } = req.params;
    const { title, description, albumIds, tags, takenAt } = req.body;
    
    // 处理位置信息
    let location = undefined;
    if (req.body.latitude !== undefined && req.body.longitude !== undefined) {
      location = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        name: req.body.locationName || null
      };
    }
    
    // 查找照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      user: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({
        message: '照片不存在'
      });
    }
    
    // 更新照片属性
    if (title !== undefined) photo.title = title;
    if (description !== undefined) photo.description = description;
    if (takenAt !== undefined) {
      try {
        photo.takenAt = takenAt ? new Date(takenAt) : null;
      } catch (error) {
        return res.status(400).json({
          message: '无效的拍摄日期格式'
        });
      }
    }
    if (location !== undefined) photo.location = location;
    
    // 处理标签更新
    if (tags !== undefined) {
      // 如果提供了标签数组，确保所有标签都存在于数据库中
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tagName of tags) {
          await Tag.findOneAndUpdate(
            { name: tagName, user: req.user.id },
            { name: tagName, user: req.user.id },
            { upsert: true, new: true }
          );
        }
        photo.tags = tags;
      } else if (tags === null || (Array.isArray(tags) && tags.length === 0)) {
        photo.tags = [];
      }
    }
    
    // 如果提供了相册IDs，更新照片和相册的关联关系
    if (albumIds !== undefined) {
      // 获取当前照片所在的所有相册
      const currentAlbumIds = photo.albums.map(id => id.toString());
      
      // 要添加的新相册IDs
      const albumIdsToAdd = albumIds.filter(id => 
        !currentAlbumIds.includes(id)
      );
      
      // 要移除的相册IDs
      const albumIdsToRemove = currentAlbumIds.filter(id => 
        !albumIds.includes(id)
      );
      
      // 为要添加的相册添加该照片
      for (const albumId of albumIdsToAdd) {
        const album = await Album.findOne({ _id: albumId, user: req.user.id });
        if (album) {
          album.photos.push(photo._id);
          await album.save();
        }
      }
      
      // 从要移除的相册中移除该照片
      for (const albumId of albumIdsToRemove) {
        const album = await Album.findOne({ _id: albumId, user: req.user.id });
        if (album) {
          album.photos = album.photos.filter(id => id.toString() !== photoId);
          await album.save();
        }
      }
      
      // 更新照片的相册列表
      photo.albums = albumIds;
    }
    
    // 保存更新后的照片
    await photo.save();
    
    // 返回更新后的照片
    res.status(200).json(photo);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: '照片数据无效',
        details: error.message
      });
    }
    next(error);
  }
}

module.exports = updatePhoto;
