const { processUploadedPhotoInitial, processUploadedPhotoFinal } = require('./utils');
const Tag = require('../../models/Tag');

/**
 * 批量上传照片
 * 采用两阶段处理：
 * 1. 快速处理并返回初始照片信息
 * 2. 异步处理照片上传到OSS、EXIF解析和标签识别
 */
async function batchUpload(req, res, next) {
  try {
    const files = req.files;
    
    if (!files || !files.length) {
      return res.status(400).json({
        code: 400,
        message: '未上传照片文件'
      });
    }

    // 解析公共元数据
    let commonMetadata = {};
    
    // 检查是否有metadata字段
    if (req.body.metadata) {
      try {
        commonMetadata = JSON.parse(req.body.metadata);
      } catch (error) {
        console.error('解析metadata字段失败:', error);
      }
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

    // 解析相册ID
    let albumIds = [];
    if (req.body.albumIds) {
      if (Array.isArray(req.body.albumIds)) {
        albumIds = req.body.albumIds;
      } else if (typeof req.body.albumIds === 'string') {
        try {
          const parsed = JSON.parse(req.body.albumIds);
          albumIds = Array.isArray(parsed) ? parsed : req.body.albumIds.split(',').filter(id => id.trim() !== '');
        } catch (e) {
          albumIds = req.body.albumIds.split(',').filter(id => id.trim() !== '');
        }
      }
    }

    // 合并公共元数据
    const baseMetadata = {
      ...commonMetadata,
      location,
      tags,
      albumIds
    };

    const uploadedPhotos = [];
    const processingPromises = [];

    // 处理每张照片
    for (const file of files) {
      // 为每张照片准备元数据
      const metadata = {
        ...baseMetadata,
        title: file.originalname.split('.')[0],
        description: null
      };

      try {
        // 第一阶段：快速处理并返回初始照片信息
        const initialPhotoData = await processUploadedPhotoInitial(file, req.user.id, metadata);
        uploadedPhotos.push(initialPhotoData.photo);

        // 第二阶段：异步处理照片上传到OSS、EXIF解析和标签识别
        const processingPromise = processUploadedPhotoFinal(initialPhotoData, req.user.id, metadata)
          .catch(err => {
            console.error(`照片 ${file.originalname} 后期处理失败:`, err);
          });
        processingPromises.push(processingPromise);
      } catch (error) {
        console.error(`处理照片 ${file.originalname} 失败:`, error);
        // 继续处理其他照片，不中断整个上传流程
      }
    }

    // 确保所有标签都存在于数据库中
    if (tags.length > 0) {
      await Promise.all(tags.map(tagName => 
        Tag.findOneAndUpdate(
          { name: tagName, user: req.user.id },
          { name: tagName, user: req.user.id },
          { upsert: true, new: true }
        )
      ));
    }

    // 返回上传结果
    res.status(201).json({
      message: `成功上传 ${uploadedPhotos.length} 张照片`,
      count: uploadedPhotos.length,
      photos: uploadedPhotos
    });

    // 异步等待所有后期处理完成
    Promise.all(processingPromises).catch(err => {
      console.error('部分照片后期处理失败:', err);
    });

  } catch (error) {
    next(error);
  }
}

module.exports = batchUpload;
