const Photo = require('../../models/Photo');
const { semanticTagMatching } = require('../../utils/aiService');

/**
 * 语义高级搜索照片
 * 在原本综合搜索的基础上，增加AI语义标签匹配功能
 * 此接口用于按照照片标题、标签或地点名称进行搜索，并支持通过AI根据语义去搜索tag
 */
async function semanticSearchPhotos(req, res, next) {
  try {
    const { 
      searchKey, // 搜索关键词，可匹配标题、标签或地点
      tags, // 指定标签过滤（数组或逗号分隔的字符串）
      enableAI = true, // 是否启用AI语义匹配，默认启用
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
    
    // 解析指定标签
    let specificTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        specificTags = tags;
      } else if (typeof tags === 'string') {
        specificTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    
    // 基础查询条件
    const baseQuery = { 
      user: req.user.id
    };
    
    // 如果指定了标签，添加标签过滤条件
    if (specificTags.length > 0) {
      baseQuery.tags = { $in: specificTags };
    }
    
    // 构建搜索条件
    let searchConditions = [
      { title: { $regex: searchKey, $options: 'i' } }, // 匹配标题
      { tags: { $regex: searchKey, $options: 'i' } }, // 匹配标签
      { 'location.name': { $regex: searchKey, $options: 'i' } } // 匹配地点名称
    ];
    
    // AI语义标签匹配
    let aiMatchedTags = [];
    const shouldUseAI = enableAI === true || enableAI === 'true';
    
    if (shouldUseAI) {
      try {
        // 获取用户所有标签
        const allUserTags = await Photo.distinct('tags', { user: req.user.id });
        
        if (allUserTags && allUserTags.length > 0) {
          // 使用AI进行语义标签匹配
          aiMatchedTags = await semanticTagMatching(searchKey, allUserTags);
          
          // 如果AI匹配到标签，添加到搜索条件中
          if (aiMatchedTags.length > 0) {
            searchConditions.push({ tags: { $in: aiMatchedTags } });
          }
        }
      } catch (aiError) {
        console.error('AI语义匹配失败，继续使用常规搜索:', aiError);
      }
    }
    
    // 组合最终查询条件
    const finalQuery = {
      ...baseQuery,
      $or: searchConditions
    };
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(finalQuery);
    
    // 获取分页数据
    const photos = await Photo.find(finalQuery)
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
      searchKey,
      specificTags,
      aiEnabled: shouldUseAI,
      aiMatchedTags: shouldUseAI ? aiMatchedTags : undefined,
      searchInfo: {
        originalSearch: searchKey,
        tagFilters: specificTags,
        aiSemanticTags: shouldUseAI ? aiMatchedTags : [],
        totalMatches: total
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = semanticSearchPhotos;
