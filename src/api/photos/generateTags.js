const Photo = require('../../models/Photo');
const path = require('path');
const { photoDir } = require('../../config/upload');
const { recognizeImageTags } = require('../../utils/imageRecognition');
const fs = require('fs-extra');

/**
 * 为照片生成自动标签
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
async function generateTags(req, res, next) {
  try {
    const { photoId } = req.params;

    // 查找照片
    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }

    // 验证权限
    if (photo.user.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        code: 403,
        message: '无权操作此照片'
      });
    }

    // 照片文件路径
    const photoFilePath = path.join(photoDir, photo.filename);
    
    // 检查文件是否存在
    if (!fs.existsSync(photoFilePath)) {
      return res.status(404).json({
        code: 404,
        message: '照片文件不存在'
      });
    }

    // 使用图像识别API获取标签
    const recognizedTags = await recognizeImageTags(photoFilePath);
    
    if (!recognizedTags || recognizedTags.length === 0) {
      return res.status(200).json({
        message: '未能识别出标签',
        tags: photo.tags
      });
    }

    // 过滤并提取准确度高于30%的标签值，同时过滤掉"其他"标签
    const filteredTags = recognizedTags.filter(tag => 
      tag.confidence >= 30 && tag.value !== '其他'
    );
    
    if (filteredTags.length === 0) {
      return res.status(200).json({
        message: '未能识别出高可信度标签',
        tags: photo.tags
      });
    }
    
    // 提取标签值
    const autoTags = filteredTags.map(tag => tag.value);
    
    // 合并标签，避免重复
    const existingTags = photo.tags || [];
    const combinedTags = [...existingTags];
    
    autoTags.forEach(tag => {
      if (!combinedTags.includes(tag)) {
        combinedTags.push(tag);
      }
    });
    
    // 更新照片文档
    photo.tags = combinedTags;
    photo.metadata = {
      ...photo.metadata,
      autoTagged: true
    };

    await photo.save();

    res.status(200).json({
      message: '成功生成标签',
      photo: {
        id: photo._id,
        tags: photo.tags,
        newTags: autoTags
      }
    });
  } catch (error) {
    console.error('生成标签失败:', error);
    next(error);
  }
}

module.exports = generateTags;
