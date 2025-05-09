const Photo = require('../../models/Photo');
const mongoose = require('mongoose');

/**
 * 获取照片列表
 */
async function getPhotos(req, res, next) {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc',
      albumId,
      tags,
      startDate,
      endDate,
      q // 搜索关键词
    } = req.query;
    
    const pageNum = parseInt(page) || 1; // 确保page不为null
    const limitNum = parseInt(limit) || 50; // 确保limit不为null
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 构建查询条件
    const query = { user: req.user.id };
    
    // 按相册过滤
    if (albumId) {
      query.albums = mongoose.Types.ObjectId.isValid(albumId) ? albumId : null;
    }
    
    // 按标签过滤
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagList };
    }
    
    // 按拍摄日期范围过滤
    if (startDate || endDate) {
      query.takenAt = {};
      if (startDate) {
        query.takenAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.takenAt.$lte = new Date(endDate);
      }
    }
    
    // 关键词搜索（标题、描述）
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(query);
    
    // 获取分页数据
    const photos = await Photo.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数，确保不为null
    const totalPages = Math.ceil(total / limitNum) || 1;
    
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

module.exports = getPhotos;
