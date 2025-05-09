const Photo = require('../../models/Photo');

/**
 * 获取所有标签
 * 返回当前用户所有照片中使用的标签及其使用次数
 */
async function getAllTags(req, res, next) {
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
}

module.exports = getAllTags;
