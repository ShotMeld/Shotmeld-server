const express = require('express');
const router = express.Router();
const { createTask, getTask } = require('../../utils/taskManager');
const { executeDuplicateDetectionTask } = require('../../utils/duplicateDetection');
const { authenticate } = require('../../middlewares/auth');

// 启动重复图片检测任务
router.get('/duplicates', authenticate, async (req, res) => {
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
router.get('/task/status/:taskId', authenticate, async (req, res) => {
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
      response.result = task.result;
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