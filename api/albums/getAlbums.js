const Album = require('../../models/Album');

/**
 * 获取相册列表
 */
async function getAlbums(req, res, next) {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 验证排序参数
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 查询当前用户的所有相册
    const query = { user: req.user.id };
    
    // 统计符合条件的文档总数
    const total = await Album.countDocuments(query);
    
    // 获取分页数据
    const albums = await Album.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数
    const totalPages = Math.ceil(total / limitNum);
    
    // 返回分页结果
    res.status(200).json({
      data: albums,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (error) {
    next(error);
  }
}

module.exports = getAlbums;
