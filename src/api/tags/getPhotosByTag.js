const Photo = require('../../models/Photo');
const Tag = require('../../models/Tag');

/**
 * 获取带有指定标签的照片
 * 返回带有指定标签的所有照片
 */
async function getPhotosByTag(req, res, next) {
  try {
    const { tagId } = req.params;
    const { 
      page = 1, 
      limit = 50,
      sort = 'takenAt',
      order = 'desc'
    } = req.query;
    
    // 确保 page 和 limit 为合法值
    const pageNum = parseInt(page || 1);
    const limitNum = Math.min(Math.max(parseInt(limit || 50), 1), 200); // 限制在1-200之间
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt', 'fileSize'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 查找标签
    const tag = await Tag.findOne({
      _id: tagId,
      user: req.user.id
    });
    
    if (!tag) {
      return res.status(404).json({
        message: '标签不存在'
      });
    }
    
    // 查询条件：照片必须包含指定标签名称且属于当前用户
    const query = {
      user: req.user.id,
      tags: tag.name
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

module.exports = getPhotosByTag;
