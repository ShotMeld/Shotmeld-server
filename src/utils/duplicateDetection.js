const Photo = require('../models/Photo');

// 计算两个 ThumbHash 之间的汉明距离
function hammingDistance(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) {
    return Infinity;
  }
  
  let distance = 0;
  const buffer1 = Buffer.from(hash1, 'base64');
  const buffer2 = Buffer.from(hash2, 'base64');
  
  for (let i = 0; i < buffer1.length; i++) {
    const xor = buffer1[i] ^ buffer2[i];
    // 计算字节中1的个数
    distance += xor.toString(2).split('1').length - 1;
  }
  
  return distance;
}

// 检测相似照片
async function detectSimilarPhotos(userId, threshold = 5) {
  try {
    // 获取用户的所有照片及其 ThumbHash
    const photos = await Photo.find({ 
      user: userId,
      'metadata.thumbHash': { $exists: true, $ne: null }
    }).select('_id metadata.thumbHash filename');
    
    if (photos.length < 2) {
      return []; // 少于2张照片，无法检测重复
    }
    
    const duplicateGroups = [];
    const processedPhotos = new Set();
    
    // 比较每对照片
    for (let i = 0; i < photos.length; i++) {
      if (processedPhotos.has(photos[i]._id.toString())) {
        continue;
      }
      
      const currentGroup = [photos[i]._id.toString()];
      const currentHash = photos[i].metadata.thumbHash;
      
      for (let j = i + 1; j < photos.length; j++) {
        if (processedPhotos.has(photos[j]._id.toString())) {
          continue;
        }
        
        const compareHash = photos[j].metadata.thumbHash;
        const distance = hammingDistance(currentHash, compareHash);
        
        // 如果汉明距离小于阈值，认为是相似照片
        if (distance <= threshold) {
          currentGroup.push(photos[j]._id.toString());
          processedPhotos.add(photos[j]._id.toString());
        }
      }
      
      // 如果找到了相似照片（组中有多于1张照片），添加到结果中
      if (currentGroup.length > 1) {
        duplicateGroups.push(currentGroup);
        currentGroup.forEach(id => processedPhotos.add(id));
      }
    }
    
    return duplicateGroups;
  } catch (error) {
    console.error('检测相似照片时出错:', error);
    throw error;
  }
}

// 异步执行相似照片检测任务
async function executeDuplicateDetectionTask(taskId, userId) {
  const { updateTask } = require('./taskManager');
  
  try {
    // 更新任务状态为处理中
    updateTask(taskId, { status: 'processing', progress: 10 });
    
    // 执行相似照片检测
    const duplicateGroups = await detectSimilarPhotos(userId);
    
    // 更新进度
    updateTask(taskId, { progress: 90 });
    
    // 完成任务
    updateTask(taskId, { 
      status: 'completed', 
      progress: 100,
      result: duplicateGroups
    });
    
  } catch (error) {
    console.error('执行相似照片检测任务失败:', error);
    updateTask(taskId, { 
      status: 'failed', 
      progress: 0,
      error: {
        message: error.message,
        code: 'DETECTION_FAILED'
      }
    });
  }
}

module.exports = {
  detectSimilarPhotos,
  executeDuplicateDetectionTask,
  hammingDistance
};