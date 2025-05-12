const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { tempDir, photoDir, thumbnailDir, ossPhotoPath, ossThumbnailPath } = require('../../config/upload');
const config = require('../../config/config');
const { uploadFile, getFileUrl, deleteFile } = require('../../utils/oss');

// 处理上传图片并创建缩略图
async function processUploadedPhoto(file, userId, metadata = {}) {
  try {
    // 读取图片元数据
    const imageInfo = await sharp(file.path).metadata();

    // 创建缩略图
    const thumbnailFilename = `thumb_${path.basename(file.path)}`;
    const thumbnailPath = path.join(tempDir, thumbnailFilename);

    // 生成缩略图 (调整大小到300px宽度)
    await sharp(file.path)
      .resize({ width: 300 })
      .toFile(thumbnailPath);
    
    // 上传原图和缩略图到OSS
    const ossPhotoFilepath = `${ossPhotoPath}${file.filename}`;
    const ossThumbnailFilepath = `${ossThumbnailPath}${thumbnailFilename}`;
    
    // 上传原图到OSS
    await uploadFile(file.path, ossPhotoFilepath);
    // 上传缩略图到OSS
    await uploadFile(thumbnailPath, ossThumbnailFilepath);
    
    // 可选：备份到本地目录
    const localPhotoPath = path.join(photoDir, file.filename);
    const localThumbPath = path.join(thumbnailDir, thumbnailFilename);
    await fs.copy(file.path, localPhotoPath);
    await fs.copy(thumbnailPath, localThumbPath);
    
    // 生成OSS图片URL（或使用OSS域名）
    let photoUrl, thumbnailUrl;
    
    if (process.env.OSS_CUSTOM_DOMAIN) {
      // 如果配置了自定义域名，使用自定义域名
      photoUrl = `${process.env.OSS_CUSTOM_DOMAIN}/${ossPhotoFilepath}`;
      thumbnailUrl = `${process.env.OSS_CUSTOM_DOMAIN}/${ossThumbnailFilepath}`;
    } else {
      // 否则使用签名URL（有时效性）或默认的OSS域名URL
      photoUrl = getFileUrl(ossPhotoFilepath, 3600 * 24 * 365); // 1年有效期
      thumbnailUrl = getFileUrl(ossThumbnailFilepath, 3600 * 24 * 365);
    }
    
    // 删除临时文件
    await fs.remove(file.path);
    await fs.remove(thumbnailPath);
    
    if (process.env.OSS_CUSTOM_DOMAIN) {
      // 如果配置了自定义域名，使用自定义域名
      photoUrl = `${process.env.OSS_CUSTOM_DOMAIN}/${ossPhotoFilepath}`;
      thumbnailUrl = `${process.env.OSS_CUSTOM_DOMAIN}/${ossThumbnailFilepath}`;
    } else {
      // 否则使用签名URL（有时效性）或默认的OSS域名URL
      photoUrl = getFileUrl(ossPhotoFilepath, 3600 * 24 * 365); // 1年有效期
      thumbnailUrl = getFileUrl(ossThumbnailFilepath, 3600 * 24 * 365);
    }

    // 提取拍摄时间或使用当前时间
    let takenAt = null;
    if (metadata.takenAt) {
      try {
        takenAt = new Date(metadata.takenAt);
      } catch (error) {
        console.error("无效的拍摄日期格式:", error);
      }
    }

    // 如果未指定拍摄时间，尝试从EXIF中提取
    if (!takenAt && imageInfo.exif) {
      try {
        // 尝试解析EXIF数据中的日期
        // 此处需根据实际EXIF处理库来实现
      } catch (error) {
        console.error("无法从EXIF提取日期:", error);
      }
    }

    // 创建照片记录
    const photo = new Photo({
      title: metadata.title || file.originalname.split('.')[0],
      description: metadata.description || null,
      filename: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      width: imageInfo.width,
      height: imageInfo.height,
      url: photoUrl,
      thumbnailUrl: thumbnailUrl,
      takenAt: takenAt,
      location: metadata.location,
      metadata: {
        ...imageInfo,
        originalName: file.originalname
      },
      user: userId,
      albums: [],
      tags: metadata.tags || []
    });

    // 保存照片
    await photo.save();

    // 如果指定了相册，将照片添加到相册中
    if (metadata.albumIds && metadata.albumIds.length > 0) {

      for (const albumId of metadata.albumIds) {
        try {
          const album = await Album.findById(albumId);

          if (!album) {
            continue;
          }

          if (album.user.toString() === userId.toString()) {
            album.photos.push(photo._id);
            photo.albums.push(albumId);
            await album.save();
          }
        } catch (err) {
          console.error(`处理相册 ${albumId} 时出错:`, err);
        }
      }

      // 更新并保存照片的相册关系
      try {
        await photo.save();
      } catch (err) {
        console.error('保存照片相册关系时出错:', err);
      }
    }

    return photo;
  } catch (error) {
    // 如果处理过程中出错，删除已上传的文件
    try {
      // 尝试从OSS删除
      const ossPhotoKey = `${ossPhotoPath}${file.filename}`;
      const ossThumbnailKey = `${ossThumbnailPath}thumb_${file.filename}`;
      
      try {
        await deleteFile(ossPhotoKey);
        await deleteFile(ossThumbnailKey);
      } catch (ossError) {
        console.error('清理OSS文件失败:', ossError);
      }
      
      // 删除本地临时文件
      if (file.path && fs.existsSync(file.path)) {
        await fs.unlink(file.path);
      }

      const thumbnailPath = path.join(tempDir, `thumb_${file.filename}`);
      if (fs.existsSync(thumbnailPath)) {
        await fs.unlink(thumbnailPath);
      }
      
      // 删除本地备份文件
      const localPhotoPath = path.join(photoDir, file.filename);
      const localThumbPath = path.join(thumbnailDir, `thumb_${file.filename}`);
      
      if (fs.existsSync(localPhotoPath)) {
        await fs.unlink(localPhotoPath);
      }
      
      if (fs.existsSync(localThumbPath)) {
        await fs.unlink(localThumbPath);
      }
    } catch (cleanupError) {
      console.error('清理文件失败:', cleanupError);
    }

    throw error;
  }
}

module.exports = processUploadedPhoto;
