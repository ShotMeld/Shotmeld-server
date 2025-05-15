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
    const client = createImageRecogClient();
    const fileStream = fs.createReadStream(imagePath);
    
    const taggingImageAdvanceRequest = new ImagerecogClient.TaggingImageAdvanceRequest({
      imageURLObject: fileStream
    });
    
    // 增加更长的超时设置
    const runtime = new TeaUtil.RuntimeOptions({
      readTimeout: 30000,    // 读取超时时间，30秒
      connectTimeout: 10000, // 连接超时时间，10秒
      retry: {               // 重试策略
        maxRetryTimes: 3,    // 最大重试次数
        retryPolicy: 'backoff', // 重试策略
        backoffStrategy: 'exponential' // 指数退避策略
      }
    });
    
    const response = await client.taggingImageAdvance(taggingImageAdvanceRequest, runtime);
    
    if (response && response.body && response.body.data) {
      // 返回识别的标签数组
      return response.body.data.tags || [];
    }
    
    return [];
  } catch (error) {
    console.error('图像识别失败:', error);
    // 增加更详细的错误日志
    if (error.code) {
      console.error(`错误代码: ${error.code}, 错误消息: ${error.message}`);
    }
    
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
    
    return [];
  }
};

module.exports = {
  recognizeImageTags
};
