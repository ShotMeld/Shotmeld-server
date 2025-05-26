const Photo = require('../../models/Photo');

/**
 * 获取所有标签
 * 返回当前用户所有照片中使用的标签及其使用次数
 */
async function getAllTags(req, res, next) {
  try {
    // 聚合查询，直接从照片中获取标签统计信息
    const tagsAggregation = await Photo.aggregate([
      // 只查询当前用户的照片
      { $match: { user: req.user.id } },
      // 解构标签数组
      { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
      // 按标签名分组并计数
      { 
        $group: { 
          _id: "$tags", 
          name: { $first: "$tags" },
          photoCount: { $sum: 1 } 
        } 
      },
      // 排序：按照照片数量降序
      { $sort: { photoCount: -1 } },
      // 格式化输出结果
      { 
        $project: { 
          _id: 0, 
          name: 1, 
          photoCount: 1
        } 
      }
    ]);
    
    res.status(200).json(tagsAggregation);
  } catch (error) {
    next(error);
  }
}

module.exports = getAllTags;
