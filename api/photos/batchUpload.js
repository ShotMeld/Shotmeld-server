const processUploadedPhoto = require('./utils');

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
    
    // 处理公共元数据（如相册ID和标签）
    const albumId = req.body.albumId;
    const tags = req.body.tags ? 
      (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : 
      [];
    
    const uploadedPhotos = [];
    
    // 处理每张照片
    for (const file of files) {
      // 为每张照片准备元数据
      const metadata = {
        albumIds: albumId ? [albumId] : [],
        tags: tags
      };
      
      // 处理并保存照片
      const photo = await processUploadedPhoto(file, req.user.id, metadata);
      uploadedPhotos.push(photo);
    }
    
    // 返回上传结果
    res.status(201).json({
      uploadedCount: uploadedPhotos.length,
      photos: uploadedPhotos
    });
  } catch (error) {
    next(error);
  }
}

module.exports = batchUpload;
