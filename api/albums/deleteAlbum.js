const Album = require('../../models/Album');
const Photo = require('../../models/Photo');
const mongoose = require('mongoose');

/**
 * 删除相册
 */
async function deleteAlbum(req, res, next) {
  try {
    const { albumId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 从所有相关照片中移除此相册的引用
    await Photo.updateMany(
      { albums: albumId },
      { $pull: { albums: albumId } }
    );
    
    // 删除相册
    await Album.deleteOne({ _id: albumId });
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = deleteAlbum;
