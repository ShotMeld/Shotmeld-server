const Album = require('../../models/Album');
const Photo = require('../../models/Photo');
const mongoose = require('mongoose');

/**
 * 添加照片到相册
 */
async function addPhotoToAlbum(req, res, next) {
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
    
    // 检查照片是否已经在相册中
    if (!album.photos.includes(photoId)) {
      // 将照片添加到相册
      album.photos.push(photoId);
      await album.save();
    }
    
    // 检查相册是否已经在照片的相册列表中
    if (!photo.albums.includes(albumId)) {
      // 将相册添加到照片的相册列表
      photo.albums.push(albumId);
      await photo.save();
    }
    
    // 返回成功状态
    res.status(200).json({
      message: '照片已成功添加到相册'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = addPhotoToAlbum;
