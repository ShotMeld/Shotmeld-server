const { v4: uuidv4 } = require('uuid');

// 内存存储任务状态（生产环境建议使用 Redis）
const tasks = new Map();

// 创建新任务
function createTask(type, userId) {
  const taskId = uuidv4();
  const task = {
    id: taskId,
    type,
    userId,
    status: 'pending',
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  tasks.set(taskId, task);
  return task;
}

// 更新任务状态
function updateTask(taskId, updates) {
  const task = tasks.get(taskId);
  if (!task) {
    throw new Error('任务不存在');
  }
  
  Object.assign(task, updates, { updatedAt: new Date() });
  tasks.set(taskId, task);
  return task;
}

// 获取任务状态
function getTask(taskId) {
  return tasks.get(taskId);
}

// 删除过期任务（24小时后）
function cleanupExpiredTasks() {
  const now = new Date();
  const expiredTime = 24 * 60 * 60 * 1000; // 24小时
  
  for (const [taskId, task] of tasks.entries()) {
    if (now - task.updatedAt > expiredTime) {
      tasks.delete(taskId);
    }
  }
}

// 定期清理过期任务
setInterval(cleanupExpiredTasks, 60 * 60 * 1000); // 每小时清理一次

module.exports = {
  createTask,
  updateTask,
  getTask,
  cleanupExpiredTasks
};