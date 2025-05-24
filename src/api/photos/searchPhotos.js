const Photo = require('../../models/Photo');

/**
 * 综合搜索照片
 * 此接口用于按照照片标题、标签或地点名称进行搜索，支持分页和排序
 */
async function searchPhotos(req, res, next) {
  try {
    const { 
      searchKey, // 搜索关键词，可匹配标题、标签或地点
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc'
    } = req.query;
    
    // 检查搜索关键词是否存在
    if (!searchKey || typeof searchKey !== 'string') {
      return res.status(400).json({ 
        error: 'SEARCH_KEY_REQUIRED',
        message: '请提供搜索关键词' 
      });
    }
    
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(Math.max(parseInt(limit) || 50, 1), 200); // 限制在1-200之间
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt', 'fileSize'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 构建查询条件
    const query = { 
      user: req.user.id,
      $or: [
        { title: { $regex: searchKey, $options: 'i' } }, // 匹配标题
        { tags: { $regex: searchKey, $options: 'i' } }, // 匹配标签
        { 'location.name': { $regex: searchKey, $options: 'i' } } // 匹配地点名称
      ]
    };
    
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
      totalPages,
      searchKey
    });
  } catch (error) {
    next(error);
  }
}

module.exports = searchPhotos;