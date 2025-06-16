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

    // 检查批量上传数量限制
    if (files.length > batchUploadConfig.limits.maxBatchSize) {
      return res.status(400).json({
        code: 400,
        message: `批量上传文件数量超出限制，最大允许 ${batchUploadConfig.limits.maxBatchSize} 个文件`
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
      // 确保locationName是字符串类型
      let locationName = req.body.locationName;
      if (Array.isArray(locationName)) {
        locationName = locationName.length > 0 ? locationName[0] : null;
      } else if (locationName && typeof locationName !== 'string') {
        locationName = String(locationName);
      }
      
      location = {
        latitude: parseFloat(req.body.latitude),
        longitude: parseFloat(req.body.longitude),
        name: locationName || null
      };
    }

    // 解析标签
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag =>
        tag.confidence >= 30 && tag.value !== '其他');
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
    const failedPhotos = [];
    const photoDataList = []; // 保存初始处理数据

    // 处理每张照片（第一阶段 - 快速创建记录）
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
        photoDataList.push({ initialPhotoData, metadata });
      } catch (error) {
        console.error(`处理照片 ${file.originalname} 失败:`, error);
        failedPhotos.push({
          filename: file.originalname,
          error: error.message
        });
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
      message: `成功接收 ${uploadedPhotos.length} 张照片，正在后台处理`,
      count: uploadedPhotos.length,
      photos: uploadedPhotos
    });

    // 异步串行处理所有照片的OSS上传和后期处理
    setTimeout(async () => {
      console.log(`开始串行处理 ${photoDataList.length} 张照片的OSS上传`);
      
      for (let i = 0; i < photoDataList.length; i++) {
        const { initialPhotoData, metadata } = photoDataList[i];
        try {
          await processUploadedPhotoFinal(initialPhotoData, req.user.id, metadata);
          console.log(`照片 ${initialPhotoData.photo.filename} 处理完成 (${i + 1}/${photoDataList.length})`);
        } catch (err) {
          console.error(`照片 ${initialPhotoData.photo.filename} 后期处理失败:`, err.message);
          failedPhotos.push({
            filename: initialPhotoData.photo.filename,
            error: err.message
          });
        }
      }
      
      console.log(`批量上传完成：成功 ${photoDataList.length - failedPhotos.length} 张，失败 ${failedPhotos.length} 张`);
    }, 0);

  } catch (error) {
    next(error);
  }
}

module.exports = batchUpload;
