const Album = require('../../models/Album');
const Photo = require('../../models/Photo');
const mongoose = require('mongoose');

/**
 * 获取相册中的照片
 */
async function getAlbumPhotos(req, res, next) {
  try {
    const { albumId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc' 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 确认相册存在且属于当前用户
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
    
    // 查询条件：照片必须在指定的相册中
    const query = {
      user: req.user.id,
      albums: albumId
    };
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(query);
    
    // 获取分页数据
    const photos = await Photo.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数
    const totalPages = Math.ceil(total / limitNum);
    
    // 返回分页结果
    res.status(200).json({
      data: photos,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (error) {
    next(error);
  }
}

module.exports = getAlbumPhotos;
