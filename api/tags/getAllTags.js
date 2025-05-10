const Tag = require('../../models/Tag');
const Photo = require('../../models/Photo');

/**
 * 获取所有标签
 * 返回当前用户所有照片中使用的标签及其使用次数
 */
async function getAllTags(req, res, next) {
  try {
    // 查询所有标签
    const tags = await Tag.find({ user: req.user.id });
    
    // 为每个标签计算照片数量
    const tagList = [];
    
    for (const tag of tags) {
      // 计算使用此标签的照片数量
      const photoCount = await Photo.countDocuments({ 
        user: req.user.id,
        tags: tag.name
      });
      
      // 设置虚拟字段
      tag.photoCount = photoCount;
      
      tagList.push(tag);
    }
    
    // 按照使用次数降序排序
    tagList.sort((a, b) => b.photoCount - a.photoCount);
    
    res.status(200).json(tagList);
  } catch (error) {
    next(error);
  }
}

module.exports = getAllTags;
