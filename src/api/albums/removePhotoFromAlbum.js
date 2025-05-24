const Album = require('../../models/Album');
const Photo = require('../../models/Photo');

/**
 * 从相册中移除照片
 */
async function removePhotoFromAlbum(req, res, next) {
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
      user: req.user.id,
      albums: albumId
    });
    
    // 记录实际找到的照片数量
    const foundCount = photos.length;
    
    // 批量处理照片
    for (const photo of photos) {
      // 从照片的相册列表中移除相册
      photo.albums = photo.albums.filter(a => a.toString() !== albumId);
      await photo.save();
    }
    
    // 从相册中移除所有指定的照片
    album.photos = album.photos.filter(p => !photoIds.includes(p.toString()));
    await album.save();
    
    // 返回成功状态，按照API规范修改为204状态码
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = removePhotoFromAlbum;
