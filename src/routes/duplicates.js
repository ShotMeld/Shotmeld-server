const express = require('express');
const router = express.Router();
const { createTask, getTask } = require('../utils/taskManager');
const { executeDuplicateDetectionTask } = require('../utils/duplicateDetection');
const { authenticate } = require('../middlewares/auth');

// 启动重复图片检测任务
router.get('/photos-tool/duplicates', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 创建异步任务
    const task = createTask('duplicate_detection', userId);
    
    // 异步执行检测任务（不等待完成）
    setImmediate(() => {
      executeDuplicateDetectionTask(task.id, userId);
    });
    
    res.json({ taskId: task.id });
  } catch (error) {
    console.error('启动重复图片检测任务失败:', error);
    res.status(500).json({
      error: '查找重复图片时出错',
      message: '无法启动重复图片检测任务'
    });
  }
});

// 获取异步任务状态
// 返回数据结构说明：
// - 对于重复照片检测任务，result.duplicateGroups 包含多个照片组
// - 每个组是一个数组，包含相似照片的完整 Photo 模型对象
// - Photo 模型包含：id, title, description, filename, fileSize, mimeType, width, height, 
//   url, thumbnailUrl, takenAt, location, metadata, isShared, user, albums, tags, createdAt, updatedAt
router.get('/photos-tool/task/status/:taskId', authenticate, async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.id;
    
    const task = getTask(taskId);
    
    if (!task) {
      return res.status(404).json({
        error: '任务不存在',
        message: '找不到指定的任务ID'
      });
    }
    
    // 检查任务是否属于当前用户
    if (task.userId !== userId) {
      return res.status(403).json({
        error: '无权访问',
        message: '您无权查看此任务'
      });
    }
    
    // 返回任务状态
    const response = {
      status: task.status,
      progress: task.progress
    };
    
    // 如果任务完成，包含结果
    if (task.status === 'completed' && task.result) {
      response.result = {
        duplicateGroups: task.result, // 每个组包含相似的照片完整对象数组
        totalGroups: task.result.length,
        totalDuplicatePhotos: task.result.reduce((sum, group) => sum + group.length, 0)
      };
    }
    
    // 如果任务失败，包含错误信息
    if (task.status === 'failed' && task.error) {
      response.error = task.error;
    }
    
    res.json(response);
  } catch (error) {
    console.error('获取任务状态失败:', error);
    res.status(500).json({
      error: '获取任务状态失败',
      message: '服务器内部错误'
    });
  }
});

module.exports = router;