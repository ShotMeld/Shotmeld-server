const Album = require('../../models/Album');
const Photo = require('../../models/Photo');

/**
 * 添加照片到相册
 */
async function addPhotoToAlbum(req, res, next) {
  try {
    const { albumId } = req.params;
    const { photoIds } = req.body;
    
    // 验证 photoIds 格式
    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return res.status(400).json({
        message: '请提供有效的照片ID列表'
      });
    }
    
    // 查找相册，确保它存在且属于当前用户
    const album = await Album.findOne({ _id: albumId, user: req.user.id });
    
    if (!album) {
      return res.status(404).json({
        message: '相册不存在'
      });
    }
    
    // 查找所有照片，确保它们都存在且属于当前用户
    const photos = await Photo.find({ 
      _id: { $in: photoIds }, 
      user: req.user.id 
    });
    
    // 检查是否所有照片都找到了
    if (photos.length !== photoIds.length) {
      const foundIds = photos.map(photo => photo._id.toString());
      const missingIds = photoIds.filter(id => !foundIds.includes(id));
      
      return res.status(404).json({
        message: '部分照片不存在或无权限访问',
        details: missingIds
      });
    }
    
    // 添加照片到相册
    let addedCount = 0;
    for (const photo of photos) {
      // 检查照片是否已经在相册中
      if (!album.photos.includes(photo._id)) {
        // 将照片添加到相册
        album.photos.push(photo._id);
        addedCount++;
      }
      
      // 检查相册是否已经在照片的相册列表中
      if (!photo.albums.includes(albumId)) {
        // 将相册添加到照片的相册列表
        photo.albums.push(albumId);
        await photo.save();
      }
    }
    
    // 保存相册
    await album.save();
    
    // 返回成功状态，符合API规范中定义的返回内容
    res.status(200).json({
      message: `成功添加 ${addedCount} 张照片到相册`,
      added: addedCount,
      album: album // 包含相册的当前状态
    });
  } catch (error) {
    next(error);
  }
}

module.exports = addPhotoToAlbum;
