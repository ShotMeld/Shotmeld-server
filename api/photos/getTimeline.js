const Photo = require('../../models/Photo');

/**
 * 获取照片时间轴
 */
async function getTimeline(req, res, next) {
  try {
    const { 
      groupBy = 'month', 
      startDate, 
      endDate 
    } = req.query;
    
    // 验证 groupBy 参数
    if (!['year', 'month', 'day'].includes(groupBy)) {
      return res.status(400).json({
        message: 'groupBy 参数值无效，有效值为：year、month、day'
      });
    }
    
    // 构建查询条件
    const query = { user: req.user.id };
    
    // 按拍摄日期范围过滤
    if (startDate || endDate) {
      query.takenAt = {};
      if (startDate) {
        query.takenAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // 设置为当天的最后一秒
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);
        query.takenAt.$lte = endDateObj;
      }
    }
    
    // 获取照片列表，使用 populate 填充相册信息
    const photos = await Photo.find(query)
      .sort({ takenAt: -1 })
      .populate('albums', '_id');
    
    // 按照指定方式对照片进行分组
    const timeline = {};
    
    for (const photo of photos) {
      const takenAt = new Date(photo.takenAt);
      let dateKey;
      
      // 根据groupBy参数确定日期格式
      switch(groupBy) {
        case 'year':
          dateKey = takenAt.getFullYear().toString();
          break;
        case 'month':
          // 格式：YYYY-MM（例如：2024-04）
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'day':
          // 格式：YYYY-MM-DD（例如：2024-04-08）
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}-${takenAt.getDate().toString().padStart(2, '0')}`;
          break;
        default:
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      
      if (!timeline[dateKey]) {
        timeline[dateKey] = {
          date: dateKey,
          count: 0,
          photos: []
        };
      }
      
      // 添加完整的照片对象，并处理相册ID
      const photoObject = photo.toJSON();
      
      // 确保相册字段是ID数组
      if (photoObject.albums && Array.isArray(photoObject.albums)) {
        photoObject.albums = photoObject.albums.map(album => album.id || album._id || album);
      }
      
      timeline[dateKey].photos.push(photoObject);
      
      // 增加计数
      timeline[dateKey].count++;
    }
    
    // 将对象转换为数组并按日期排序
    const timelineArray = Object.values(timeline).sort((a, b) => {
      // 按日期降序排序（最近的日期在前）
      return b.date.localeCompare(a.date);
    });
    
    // 直接返回时间轴数组作为响应
    res.status(200).json(timelineArray);
  } catch (error) {
    next(error);
  }
}

module.exports = getTimeline;
