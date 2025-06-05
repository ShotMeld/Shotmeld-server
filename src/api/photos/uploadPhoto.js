const { processUploadedPhotoInitial, processUploadedPhotoFinal } = require('./utils');
const Album = require('../../models/Album');
const crypto = require('crypto');

/**
 * 上传新照片
 */
async function uploadPhoto(req, res, next) {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: 400,
        message: '未上传照片文件'
      });
    }

    // 解析表单中的元数据 - 支持直接传递元数据字段或metadata字段
    let title, description, takenAt, albumIds;

    // 检查是否有metadata字段，如果有则尝试解析
    if (req.body.metadata) {
      try {
        const metadata = JSON.parse(req.body.metadata);

        title = metadata.title || req.body.title;
        description = metadata.description || req.body.description;
        takenAt = metadata.takenAt || req.body.takenAt;
        albumIds = metadata.albumIds || req.body.albumIds;
      } catch (error) {
        console.error('解析metadata字段失败:', error);
      }
    } else {
      // 直接从请求体中获取
      ({ title, description, takenAt, albumIds } = req.body);
    }

    // 解析位置信息
    let location = null;
    if (req.body.latitude && req.body.longitude) {
      location = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        name: req.body.locationName || null
      };
    }

    // 解析标签
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // 整合元数据
    let parsedAlbumIds = [];

    if (albumIds) {
      // 处理不同格式的albumIds输入
      if (Array.isArray(albumIds)) {
        // 如果已经是数组，直接使用
        parsedAlbumIds = albumIds;
      } else if (typeof albumIds === 'string') {
        try {
          // 尝试解析JSON格式的字符串
          const parsed = JSON.parse(albumIds);
          if (Array.isArray(parsed)) {
            parsedAlbumIds = parsed;
          } else {
            // 如果不是数组，假设是逗号分隔的字符串
            parsedAlbumIds = albumIds.split(',').filter(id => id.trim() !== '');
          }
        } catch (e) {
          // 如果JSON解析失败，假设是逗号分隔的字符串
          parsedAlbumIds = albumIds.split(',').filter(id => id.trim() !== '');
        }
      }
    }

    const metadata = {
      title,
      description,
      takenAt,
      location,
      tags,
      albumIds: parsedAlbumIds
    };

    try {
      // 第一阶段：快速处理并返回初始照片信息（使用本地URL）
      const initialPhotoData = await processUploadedPhotoInitial(file, req.user.id, metadata);

      // 计算缩略图的哈希值
      if (initialPhotoData.photo.thumbnailUrl) {
        const hash = crypto.createHash('sha256');
        hash.update(initialPhotoData.photo.thumbnailUrl);
        initialPhotoData.photo.thumbHash = hash.digest('hex').substring(0, 64); // 确保64位哈希值
      }

      // 立即返回成功响应，包括刚创建的照片信息
      res.status(201).json(initialPhotoData.photo);

      // 第二阶段：异步处理照片上传到OSS、EXIF解析和标签识别
      // 这部分不会阻塞响应，用户不需要等待
      processUploadedPhotoFinal(initialPhotoData, req.user.id, metadata)
        .catch(err => {
          console.error('照片后期处理失败:', err);
          // 这里可以添加额外的错误处理，如通知系统或重试机制
        });
    } catch (error) {
      next(error);
    }
  } catch (error) {
    next(error);
  }
}

module.exports = uploadPhoto;