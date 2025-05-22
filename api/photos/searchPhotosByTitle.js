const Photo = require('../../models/Photo');

/**
 * 根据标题搜索照片
 * 此接口专门用于按照照片标题进行搜索，支持分页和排序
 */
async function searchPhotosByTitle(req, res, next) {
  try {
    const { 
      title, // 标题搜索关键词（必需）
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc'
    } = req.query;
    
    // 检查标题参数是否存在
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ 
        error: 'TITLE_REQUIRED',
        message: '搜索关键词是必需的' 
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
      title: { $regex: title, $options: 'i' } // 不区分大小写的标题搜索
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
      searchTerm: title
    });
  } catch (error) {
    next(error);
  }
}

module.exports = searchPhotosByTitle;