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
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || config.aliCloud?.accessKeySecret
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
    const client = createImageRecogClient();
    const fileStream = fs.createReadStream(imagePath);
    
    const taggingImageAdvanceRequest = new ImagerecogClient.TaggingImageAdvanceRequest({
      imageURLObject: fileStream
    });
    
    const runtime = new TeaUtil.RuntimeOptions({});
    const response = await client.taggingImageAdvance(taggingImageAdvanceRequest, runtime);
    
    if (response && response.body && response.body.data) {
      // 返回识别的标签数组
      return response.body.data.tags || [];
    }
    
    return [];
  } catch (error) {
    console.error('图像识别失败:', error);
    return [];
  }
};

module.exports = {
  recognizeImageTags
};
