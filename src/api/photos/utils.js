const Photo = require('../../models/Photo');
const Album = require('../../models/Album');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const thumbhash = require('thumbhash');
const { tempDir, photoDir, thumbnailDir, ossPhotoPath, ossThumbnailPath } = require('../../config/upload');
const config = require('../../config/config');
const { uploadFile, getFileUrl, deleteFile } = require('../../utils/oss');
const { parseExifFromFile } = require('../../utils/exif');
const { recognizeImageTags } = require('../../utils/imageRecognition');

// 处理上传图片流程第一阶段：创建本地记录并返回
async function processUploadedPhotoInitial(file, userId, metadata = {}) {
  try {
    // 读取文件内容到内存，以便后续处理
    const fileBuffer = await fs.readFile(file.path);
    
    // 检查文件类型，HEIF/HEIC 文件需要特殊处理
    const isHeifFormat = file.mimetype === 'image/heif' || file.mimetype === 'image/heic';
    
    // 使用sharp读取图片元数据
    let sharpInstance = sharp(fileBuffer);
    
    // 如果是 HEIF 格式，设置特定选项
    if (isHeifFormat) {
      // 确保 Sharp 能够正确处理 HEIF 文件
      sharpInstance = sharpInstance.withMetadata();
    }
    
    const imageInfo = await sharpInstance.metadata();
    
    // 解析EXIF信息
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

    // 处理位置信息 - 优先使用EXIF中的GPS数据，如果存在
    let location = metadata.location;
    if (!location && exifData && exifData.gpsLatitude && exifData.gpsLongitude) {
      try {
        // 将GPS坐标转换为高德坐标并获取位置名称
        const { latitude, longitude, name } = await require('../../utils/exif').convertGPSToAMap(
          exifData.gpsLongitude,
          exifData.gpsLatitude
        );
        
        location = {
          latitude: latitude, // WGS84 latitude (as returned by convertGPSToAMap)
          longitude: longitude, // WGS84 longitude (as returned by convertGPSToAMap)
          name: name, // formatted_address from Gaode API
          originalGPS: { // 保存原始GPS坐标
            latitude: exifData.gpsLatitude,
            longitude: exifData.gpsLongitude
          }
        };
      } catch (error) {
        console.error("获取位置名称或坐标转换失败，使用原始GPS坐标:", error);
        location = {
          latitude: exifData.gpsLatitude,
          longitude: exifData.gpsLongitude,
          name: null, // 获取位置名称失败
          originalGPS: {
            latitude: exifData.gpsLatitude,
            longitude: exifData.gpsLongitude
          }
        };
      }
    }
    
    // 创建缩略图
    const thumbnailFilename = `thumb_${path.basename(file.path)}`;
    const thumbnailPath = path.join(tempDir, thumbnailFilename);
    
    // 计算 ThumbHash
    let thumbHash = null;
    try {
      // 为 ThumbHash 计算创建一个小尺寸的 RGBA 图像
      const thumbHashBuffer = await sharp(fileBuffer)
        .resize(100, 100, { fit: 'inside' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const { data, info } = thumbHashBuffer;
      const thumbHashBytes = thumbhash.rgbaToThumbHash(
        info.width,
        info.height,
        new Uint8Array(data)
      );
      
      // 将 ThumbHash 转换为 base64 字符串存储
      thumbHash = Buffer.from(thumbHashBytes).toString('base64');
    } catch (thumbHashError) {
      console.error("计算 ThumbHash 失败:", thumbHashError);
    }
    
    // 重用之前已定义的 isHeifFormat 变量，无需重新声明
    // 创建新的 Sharp 实例用于缩略图生成
    let thumbnailSharpInstance = sharp(fileBuffer);
    
    // 如果是 HEIF 格式，转换为 JPEG 格式的缩略图
    if (isHeifFormat) {
      // 先转换为 JPEG 然后生成缩略图
      await thumbnailSharpInstance
        .toFormat('jpeg')
        .resize({ width: 300 })
        .toFile(thumbnailPath);
    } else {
      // 生成缩略图 (调整大小到300px宽度)
      await thumbnailSharpInstance
        .resize({ width: 300 })
        .toFile(thumbnailPath);
    }
    
    // 可选：备份到本地目录
    const localPhotoPath = path.join(photoDir, file.filename);
    const localThumbPath = path.join(thumbnailDir, thumbnailFilename);
    await fs.copy(file.path, localPhotoPath);
    await fs.copy(thumbnailPath, localThumbPath);
    
    // 使用服务器本地URL (这些URL将在后续处理中被OSS URL替换)
    // 确保URL包含域名，使前端能够正确访问
    // 优先使用BASE_URL环境变量，确保前端可以访问
    const serverBaseUrl = process.env.BASE_URL || 'https://api.shotmeld.seeridia.top';
    const photoUrl = `${serverBaseUrl}/uploads/photos/${file.filename}`;
    const thumbnailUrl = `${serverBaseUrl}/uploads/thumbnails/${thumbnailFilename}`;
    
    // 创建照片记录（包含EXIF信息）
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
      user: userId,
      albums: [],
      tags: metadata.tags || [],
      takenAt: takenAt,
      location: location,
      metadata: {
        exif: exifData,
        thumbHash: thumbHash
      }
    });

    // 保存照片基本信息
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

    return {
      photo,
      tempFilePath: file.path,
      thumbnailPath,
      localPhotoPath,
      localThumbPath
    };
  } catch (error) {
    // 如果处理过程中出错，清理文件
    try {
      // 删除本地临时文件
      if (file.path && fs.existsSync(file.path)) {
        await fs.unlink(file.path);
      }

      const thumbnailPath = path.join(tempDir, `thumb_${file.filename}`);
      if (fs.existsSync(thumbnailPath)) {
        await fs.unlink(thumbnailPath);
      }
    } catch (cleanupError) {
      console.error('清理文件失败:', cleanupError);
    }

    throw error;
  }
}

// 处理上传图片流程第二阶段：上传到OSS，处理EXIF和标签
async function processUploadedPhotoFinal(photoData, userId, metadata = {}) {
  const { photo, tempFilePath, thumbnailPath, localPhotoPath, localThumbPath } = photoData;
  
  try {
    // 检查文件类型，HEIF/HEIC 文件可能需要特殊处理
    const isHeifFormat = photo.mimeType === 'image/heif' || photo.mimeType === 'image/heic';
    
    // 上传原图和缩略图到OSS
    const ossPhotoFilepath = `${ossPhotoPath}${photo.filename}`;
    const thumbnailFilename = `thumb_${path.basename(tempFilePath)}`;
    const ossThumbnailFilepath = `${ossThumbnailPath}${thumbnailFilename}`;
    
    // 上传原图到OSS
    await uploadFile(tempFilePath, ossPhotoFilepath);
    // 上传缩略图到OSS
    await uploadFile(thumbnailPath, ossThumbnailFilepath);
    
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
    await fs.remove(tempFilePath);
    await fs.remove(thumbnailPath);

    // 使用阿里云图像识别API识别照片标签
    let autoTags = [];
    if (config.aliCloud?.autoTagPhotos) {
      try {
        // 检查文件大小，如果超过3MB则使用缩略图进行识别（阿里平台的限制）
        const fileStats = await fs.stat(localPhotoPath);
        const fileSizeInMB = fileStats.size / (1024 * 1024);
        
        // 使用本地保存的照片文件路径进行标签识别
        const recognizedTags = await recognizeImageTags(
          fileSizeInMB > 3 ? localThumbPath : localPhotoPath
        );
        
        if (recognizedTags && recognizedTags.length > 0) {
          // 只提取准确度高于30%的标签
          autoTags = recognizedTags
            .filter(tag =>
              tag.confidence >= 30 && tag.value !== '其他')
            .map(tag => tag.value);
        }
      } catch (tagError) {
        console.error('图像标签识别失败:', tagError);
      }
    }
    
    // 合并用户手动添加的标签和自动识别的标签
    const combinedTags = [...(photo.tags || [])];
    
    // 添加自动识别的标签（避免重复）
    if (autoTags.length > 0) {
      autoTags.forEach(tag => {
        if (!combinedTags.includes(tag)) {
          combinedTags.push(tag);
        }
      });
    }

    // 更新照片记录
    photo.url = photoUrl;
    photo.thumbnailUrl = thumbnailUrl;
    photo.tags = combinedTags;
    photo.metadata = {
      ...photo.metadata,
      autoTagged: autoTags.length > 0 // 标记是否使用了自动标签功能
    };

    // 保存更新后的照片信息
    await photo.save();
    
    return photo;
  } catch (error) {
    console.error('处理照片最终阶段失败:', error);
    
    // 如果后续处理失败，记录错误但不影响已保存的照片
    try {
      // 尝试从OSS删除
      const ossPhotoKey = `${ossPhotoPath}${photo.filename}`;
      const ossThumbnailKey = `${ossThumbnailPath}thumb_${photo.filename}`;
      
      try {
        await deleteFile(ossPhotoKey);
        await deleteFile(ossThumbnailKey);
      } catch (ossError) {
        console.error('清理OSS文件失败:', ossError);
      }
    } catch (cleanupError) {
      console.error('清理失败时出错:', cleanupError);
    }
    
    // 不抛出异常，因为这是后台处理，用户已收到响应
    return photo;
  }
}

// 向后兼容的原始处理函数
async function processUploadedPhoto(file, userId, metadata = {}) {
  const initialResult = await processUploadedPhotoInitial(file, userId, metadata);
  const finalResult = await processUploadedPhotoFinal(initialResult, userId, metadata);
  return finalResult;
}

module.exports = {
  processUploadedPhoto,
  processUploadedPhotoInitial,
  processUploadedPhotoFinal
};
