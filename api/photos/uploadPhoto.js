const processUploadedPhoto = require('./utils');

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
    
    // 解析可能作为JSON字符串提交的元数据
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (error) {
        return res.status(400).json({
          code: 400,
          message: '照片元数据格式无效'
        });
      }
    }
    
    // 处理上传的照片
    const photo = await processUploadedPhoto(file, req.user.id, metadata);
    
    // 返回创建的照片
    res.status(201).json(photo);
  } catch (error) {
    next(error);
  }
}

module.exports = uploadPhoto;
