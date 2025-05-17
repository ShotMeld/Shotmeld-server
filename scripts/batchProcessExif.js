/**
 * 批量处理照片EXIF信息的脚本
 * 
 * 用法:
 * node scripts/batchProcessExif.js
 * 
 * 可选参数:
 * --user=<userId>     只处理指定用户的照片
 * --limit=<数量>      限制处理的照片数量
 * --skip=<数量>       跳过指定数量的照片
 * --force             强制重新解析所有照片的EXIF（即使已有EXIF数据）
 */

const path = require('path');
const fs = require('fs-extra');
const mongoose = require('mongoose');
const { parseExifFromFile } = require('../utils/exif');
const Photo = require('../models/Photo');
const config = require('../config/config');
const { photoDir, ossPhotoPath } = require('../config/upload');
const { getFileBuffer } = require('../utils/oss');

// 处理命令行参数
const args = process.argv.slice(2).reduce((acc, arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    acc[key] = value || true;
  }
  return acc;
}, {});

// 连接到MongoDB
mongoose.connect(config.MONGODB_URI)
  .then(() => {
    console.log('已连接到MongoDB');
    return processPhotos();
  })
  .then(() => {
    console.log('批量处理EXIF完成');
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('错误:', err);
    mongoose.disconnect();
    process.exit(1);
  });

async function processPhotos() {
  // 构建查询条件
  const query = {};
  
  // 如果指定了用户ID，只处理该用户的照片
  if (args.user) {
    query.user = args.user;
    console.log(`只处理用户 ${args.user} 的照片`);
  }
  
  // 如果不强制更新，则只处理没有EXIF数据的照片
  if (!args.force) {
    query['metadata.exif'] = { $exists: false };
    console.log('只处理缺少EXIF数据的照片');
  } else {
    console.log('将重新处理所有照片的EXIF数据');
  }
  
  // 获取要处理的照片数量
  const totalPhotos = await Photo.countDocuments(query);
  console.log(`找到 ${totalPhotos} 张需要处理的照片`);
  
  // 设置批处理参数
  const limit = parseInt(args.limit) || totalPhotos;
  const skip = parseInt(args.skip) || 0;
  
  console.log(`将处理 ${limit} 张照片，跳过 ${skip} 张`);
  
  // 获取照片列表
  const photos = await Photo.find(query)
    .skip(skip)
    .limit(limit)
    .lean();
  
  if (photos.length === 0) {
    console.log('没有照片需要处理');
    return;
  }
  
  console.log(`开始处理 ${photos.length} 张照片`);
  
  // 统计信息
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  // 逐个处理照片
  for (const photo of photos) {
    try {
      const photoPath = path.join(photoDir, photo.filename);
      let fileBuffer = null;
      
      // 先尝试从本地文件解析
      if (fs.existsSync(photoPath)) {
        console.log(`从本地读取照片: ${photo.filename}`);
        fileBuffer = await fs.readFile(photoPath);
      } else {
        // 从OSS获取文件
        try {
          console.log(`从OSS读取照片: ${photo.filename}`);
          const ossFilePath = `${ossPhotoPath}${photo.filename}`;
          fileBuffer = await getFileBuffer(ossFilePath);
        } catch (ossError) {
          console.error(`从OSS获取照片 ${photo._id} 失败:`, ossError);
          failed++;
          processed++;
          continue;
        }
      }
      
      // 检查是否成功获取文件
      if (!fileBuffer) {
        console.error(`无法获取照片 ${photo._id} 的文件数据`);
        failed++;
        processed++;
        continue;
      }
      
      // 解析EXIF信息
      const exifData = await parseExifFromFile(fileBuffer);
      
      if (!exifData) {
        console.log(`照片 ${photo._id} 没有EXIF数据`);
        failed++;
        processed++;
        continue;
      }
      
      // 准备更新数据
      const updateData = {
        'metadata.exif': exifData
      };
      
      // 如果有拍摄时间，更新takenAt
      if (exifData.dateTimeOriginal) {
        updateData.takenAt = exifData.dateTimeOriginal;
      }
      
      // 如果有GPS信息但照片没有位置信息，更新位置
      if (exifData.gpsLatitude && exifData.gpsLongitude && !photo.location) {
        updateData.location = {
          latitude: exifData.gpsLatitude,
          longitude: exifData.gpsLongitude,
          name: null
        };
      }
      
      // 更新照片
      await Photo.findByIdAndUpdate(photo._id, { $set: updateData });
      
      succeeded++;
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`已处理 ${processed}/${photos.length} 张照片`);
      }
      
    } catch (error) {
      console.error(`处理照片 ${photo._id} 时出错:`, error);
      failed++;
      processed++;
    }
  }
  
  console.log('处理完成!');
  console.log(`总共处理: ${processed} 张照片`);
  console.log(`成功: ${succeeded} 张照片`);
  console.log(`失败: ${failed} 张照片`);
}
