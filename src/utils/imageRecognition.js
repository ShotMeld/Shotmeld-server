const ImagerecogClient = require('@alicloud/imagerecog20190930');
const OpenapiClient = require('@alicloud/openapi-client');
const TeaUtil = require('@alicloud/tea-util');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

/**
 * 图像识别客户端初始化
 */
const createImageRecogClient = () => {
  const clientConfig = new OpenapiClient.Config({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || config.aliCloud?.accessKeyId,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || config.aliCloud?.accessKeySecret,
    // 增加连接超时和读取超时设置
    connectTimeout: 10000, // 10秒连接超时
    readTimeout: 30000     // 30秒读取超时
  });
  
  // 设置阿里云图像识别服务的域名
  clientConfig.endpoint = 'imagerecog.cn-shanghai.aliyuncs.com';
  
  return new ImagerecogClient.default(clientConfig);
};

/**
 * 识别图片标签
 * @param {string} imagePath - 图片的本地路径
 * @returns {Promise<Array>} - 返回识别的标签数组
 */
const recognizeImageTags = async (imagePath) => {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(imagePath)) {
      throw new Error(`图片文件不存在: ${imagePath}`);
    }
    
    // 检查文件大小（阿里云限制为4MB）
    const stats = fs.statSync(imagePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 4) {
      throw new Error(`文件大小超出限制: ${fileSizeInMB.toFixed(2)}MB (最大4MB)`);
    }
    
    const client = createImageRecogClient();
    const fileStream = fs.createReadStream(imagePath);
    
    const taggingImageAdvanceRequest = new ImagerecogClient.TaggingImageAdvanceRequest({
      imageURLObject: fileStream
    });
    
    const runtime = new TeaUtil.RuntimeOptions({
      readTimeout: 45000,
      connectTimeout: 15000
    });
    
    const response = await client.taggingImageAdvance(taggingImageAdvanceRequest, runtime);
    
    // 确保关闭文件流
    fileStream.destroy();
    
    if (response && response.body && response.body.data) {
      return response.body.data.tags || [];
    }
    
    return [];
    
  } catch (error) {
    console.error('图像识别失败:', error.message || error);
    return []; // 返回空数组而不是抛出错误
  }
};

module.exports = {
  recognizeImageTags
};
