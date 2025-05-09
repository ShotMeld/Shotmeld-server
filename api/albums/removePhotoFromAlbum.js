const Album = require('../../models/Album');
const Photo = require('../../models/Photo');
const mongoose = require('mongoose');

/**
 * 从相册中移除照片
 */
async function removePhotoFromAlbum(req, res, next) {
  try {
    const { albumId, photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId) || !mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '相册或照片不存在'
      });
    }
    
    // 查找相册和照片，确保它们存在且属于当前用户
    const [album, photo] = await Promise.all([
      Album.findOne({ _id: albumId, user: req.user.id }),
      Photo.findOne({ _id: photoId, user: req.user.id })
    ]);
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 从相册中移除照片
    album.photos = album.photos.filter(p => p.toString() !== photoId);
    await album.save();
    
    // 从照片的相册列表中移除相册
    photo.albums = photo.albums.filter(a => a.toString() !== albumId);
    await photo.save();
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = removePhotoFromAlbum;
