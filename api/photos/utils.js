const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { tempDir, photoDir, thumbnailDir, ossPhotoPath, ossThumbnailPath } = require('../../config/upload');
const config = require('../../config/config');
const { uploadFile, getFileUrl, deleteFile } = require('../../utils/oss');
const { parseExifFromFile } = require('../../utils/exif');
const { recognizeImageTags } = require('../../utils/imageRecognition');

// 处理上传图片并创建缩略图
async function processUploadedPhoto(file, userId, metadata = {}) {
  try {
    // 读取文件内容到内存，以便后续处理
    const fileBuffer = await fs.readFile(file.path);
    
    // 使用sharp读取图片元数据
    const imageInfo = await sharp(fileBuffer).metadata();
    
    // 解析图片的EXIF信息 - 在上传到OSS前就进行解析
    let exifData = null;
    let takenAt = null;
    try {
      exifData = await parseExifFromFile(fileBuffer);
      
      // 如果有拍摄时间，从EXIF中提取
      if (exifData && exifData.dateTimeOriginal) {
        takenAt = exifData.dateTimeOriginal;
      }
    } catch (error) {
      console.error("解析EXIF数据失败:", error);
    }
    
    // 如果从EXIF提取失败，尝试使用传入的时间
    if (!takenAt && metadata.takenAt) {
      try {
        takenAt = new Date(metadata.takenAt);
      } catch (error) {
        console.error("无效的拍摄日期格式:", error);
      }
    }

    // 创建缩略图
    const thumbnailFilename = `thumb_${path.basename(file.path)}`;
    const thumbnailPath = path.join(tempDir, thumbnailFilename);

    // 生成缩略图 (调整大小到300px宽度)
    await sharp(fileBuffer)
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

    // 处理位置信息 - 优先使用EXIF中的GPS数据，如果存在
    let location = metadata.location;
    if (!location && exifData && exifData.gpsLatitude && exifData.gpsLongitude) {
      location = {
        latitude: exifData.gpsLatitude,
        longitude: exifData.gpsLongitude,
        name: null // EXIF中通常没有位置名称
      };
    }
    
    // 使用阿里云图像识别API识别照片标签
    let autoTags = [];
    if (config.aliCloud?.autoTagPhotos) {
      try {
        console.log('开始识别照片标签...');
        // 使用本地保存的照片文件路径进行标签识别
        const localPhotoPath = path.join(photoDir, file.filename);
        const recognizedTags = await recognizeImageTags(localPhotoPath);
        
        if (recognizedTags && recognizedTags.length > 0) {
          // 只提取准确度高于30%的标签
          autoTags = recognizedTags
            .filter(tag => tag.confidence >= 30)
            .map(tag => tag.value);
        }
      } catch (tagError) {
        console.error('图像标签识别失败:', tagError);
      }
    }
    
    // 合并用户手动添加的标签和自动识别的标签
    const combinedTags = [...(metadata.tags || [])];
    
    // 添加自动识别的标签（避免重复）
    if (autoTags.length > 0) {
      autoTags.forEach(tag => {
        if (!combinedTags.includes(tag)) {
          combinedTags.push(tag);
        }
      });
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
      location: location,
      metadata: {
        ...imageInfo,
        originalName: file.originalname,
        exif: exifData, // 保存解析的EXIF数据
        autoTagged: autoTags.length > 0 // 标记是否使用了自动标签功能
      },
      user: userId,
      albums: [],
      tags: combinedTags // 使用合并后的标签（手动+自动识别）
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
