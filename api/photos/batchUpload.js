const processUploadedPhoto = require('./utils');
const Tag = require('../../models/Tag');

/**
 * 批量上传照片
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
    
    // 处理公共元数据
    const albumIds = req.body.albumIds ? req.body.albumIds.split(',') : [];
    
    // 处理标签
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      // 确保所有标签都存在于数据库中
      for (const tagName of tags) {
        await Tag.findOneAndUpdate(
          { name: tagName, user: req.user.id },
          { name: tagName, user: req.user.id },
          { upsert: true, new: true }
        );
      }
    }
    
    const uploadedPhotos = [];
    
    // 处理每张照片
    for (const file of files) {
      // 为每张照片准备元数据
      const metadata = {
        albumIds: albumIds,
        tags: tags,
        // 可以添加默认的标题和描述
        title: file.originalname.split('.')[0],
        description: null
      };
      
      // 处理并保存照片
      const photo = await processUploadedPhoto(file, req.user.id, metadata);
      uploadedPhotos.push(photo);
    }
    
    // 返回上传结果
    res.status(201).json({
      message: `成功上传 ${uploadedPhotos.length} 张照片`,
      count: uploadedPhotos.length,
      photos: uploadedPhotos
    });
  } catch (error) {
    next(error);
  }
}

module.exports = batchUpload;
