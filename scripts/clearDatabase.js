const mongoose = require('mongoose');
const config = require('./config/config');

// 导入所有模型
const User = require('./models/User');
const Photo = require('./models/Photo');
const Album = require('./models/Album');
const Tag = require('./models/Tag');

async function clearDatabase() {
  try {
    // 连接到数据库
    await mongoose.connect(config.MONGODB_URI);
    console.log('MongoDB连接成功');
    
    // 清空所有集合
    console.log('开始清空数据库...');
    
    const collections = [User, Photo, Album, Tag];
    for (const Collection of collections) {
      const result = await Collection.deleteMany({});
      console.log(`清空 ${Collection.collection.name} 集合: 已删除 ${result.deletedCount} 条记录`);
    }
    
    console.log('数据库清空完成！');
  } catch (error) {
    console.error('清空数据库时发生错误:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

// 执行清空操作
clearDatabase();
