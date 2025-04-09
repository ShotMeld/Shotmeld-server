const Photo = require('../models/Photo');

/**
 * 获取所有标签
 * 返回当前用户所有照片中使用的标签及其使用次数
 */
exports.getAllTags = async (req, res, next) => {
  try {
    // 查询当前用户的所有照片
    const photos = await Photo.find({ user: req.user.id });
    
    // 统计标签使用情况
    const tagMap = {};
    
    // 遍历所有照片的标签
    photos.forEach(photo => {
      if (photo.tags && photo.tags.length > 0) {
        photo.tags.forEach(tag => {
          if (!tagMap[tag]) {
            tagMap[tag] = {
              id: tag,
              name: tag,
              photoCount: 1
            };
          } else {
            tagMap[tag].photoCount += 1;
          }
        });
      }
    });
    
    // 将对象转换为数组并按照使用次数降序排序
    const tags = Object.values(tagMap).sort((a, b) => b.photoCount - a.photoCount);
    
    res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取带有指定标签的照片
 * 返回带有指定标签的所有照片
 */
exports.getPhotosByTag = async (req, res, next) => {
  try {
    const { tagId } = req.params;
    const { 
      page = 1, 
      limit = 50
    } = req.query;
    
    // 确保 page 不为 null
    const pageNum = parseInt(page || 1);
    // 确保 limit 不为 null
    const limitNum = parseInt(limit || 50);
    
    // 验证标签是否存在
    const tagExists = await Photo.exists({
      user: req.user.id,
      tags: tagId
    });
    
    if (!tagExists) {
      return res.status(404).json({
        code: 404,
        message: '标签不存在'
      });
    }
    
    // 查询条件：照片必须包含指定标签且属于当前用户
    const query = {
      user: req.user.id,
      tags: tagId
    };
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(query);
    
    // 获取分页数据
    const photos = await Photo.find(query)
      .sort({ takenAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数，确保 totalPages 不为 null
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
};