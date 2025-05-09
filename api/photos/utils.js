const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { photoDir, thumbnailDir } = require('../../config/upload');
const config = require('../../config/config');

// 处理上传图片并创建缩略图
async function processUploadedPhoto(file, userId, metadata = {}) {
  try {
    // 读取图片元数据
    const imageInfo = await sharp(file.path).metadata();
    
    // 创建缩略图
    const thumbnailFilename = `thumb_${path.basename(file.path)}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
    
    // 生成缩略图 (调整大小到300px宽度)
    await sharp(file.path)
      .resize({ width: 300 })
      .toFile(thumbnailPath);
    
    // 图片的服务URL
    const baseUrl = process.env.BASE_URL || `http://47.96.227.28:${config.PORT}`;
    const photoUrl = `${baseUrl}/uploads/photos/${file.filename}`;
    const thumbnailUrl = `${baseUrl}/uploads/thumbnails/${thumbnailFilename}`;
    
    // 提取EXIF数据中的拍摄时间或使用当前时间
    let takenAt = new Date();
    if (metadata.takenAt) {
      takenAt = new Date(metadata.takenAt);
    }
    
    // 创建照片记录
    const photo = new Photo({
      title: metadata.title || file.originalname.split('.')[0], // 使用原始文件名作为默认标题
      description: metadata.description || '',
      filename: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      width: imageInfo.width,
      height: imageInfo.height,
      url: photoUrl,
      thumbnailUrl: thumbnailUrl,
      takenAt: takenAt,
      location: metadata.location || null,
      metadata: {
        ...imageInfo,
        originalName: file.originalname
      },
      user: userId,
      albums: metadata.albumIds || [],
      tags: metadata.tags || []
    });
    
    // 保存照片
    await photo.save();
    
    // 如果指定了相册，将照片添加到相册中
    if (metadata.albumIds && metadata.albumIds.length > 0) {
      for (const albumId of metadata.albumIds) {
        const album = await Album.findById(albumId);
        if (album && album.user.toString() === userId.toString()) {
          album.photos.push(photo._id);
          await album.save();
        }
      }
    }
    
    return photo;
  } catch (error) {
    // 如果处理过程中出错，删除已上传的文件
    if (file.path && fs.existsSync(file.path)) {
      await fs.unlink(file.path);
    }
    
    const thumbnailPath = path.join(thumbnailDir, `thumb_${file.filename}`);
    if (fs.existsSync(thumbnailPath)) {
      await fs.unlink(thumbnailPath);
    }
    
    throw error;
  }
}

module.exports = processUploadedPhoto;
