const OSS = require('ali-oss');
const path = require('path');
const fs = require('fs');

const client = new OSS({
    // yourregion填写Bucket所在地域。以华东1（杭州）为例，Region填写为oss-cn-hangzhou。
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    // 从环境变量中获取访问凭证。运行本代码示例之前，请确保已设置环境变量OSS_ACCESS_KEY_ID和OSS_ACCESS_KEY_SECRET。
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
    // 增加超时配置，解决大文件上传超时问题
    timeout: '300s',  // 5分钟超时
    // 设置重试配置
    retryMax: 3,
    retryDelay: 2000
});

/**
 * 确保OSS Bucket存在，如果不存在则创建
 * @returns {Promise<void>}
 */
async function ensureBucketExists() {
    try {
        // 检查bucket是否存在
        const bucketName = process.env.OSS_BUCKET;
        if (!bucketName) {
            throw new Error('没有设置OSS_BUCKET环境变量');
        }
        
        const bucketInfo = await client.getBucketInfo(bucketName);
        console.log('OSS 配置成功');
        
        // 确保图片和缩略图目录存在（实际上OSS没有文件夹概念，但我们可以通过前缀来模拟）
        await client.put(`photos/.folder`, Buffer.from(''));
        await client.put(`thumbnails/.folder`, Buffer.from(''));
        
        return bucketInfo;
    } catch (err) {
        // 如果bucket不存在，尝试创建
        if (err.code === 'NoSuchBucket') {
            try {
                const result = await client.putBucket(process.env.OSS_BUCKET);
                console.log('成功创建Bucket:', result);
                
                // 创建目录
                await client.put(`photos/.folder`, Buffer.from(''));
                await client.put(`thumbnails/.folder`, Buffer.from(''));
                
                return result;
            } catch (createErr) {
                console.error('创建Bucket失败:', createErr);
                throw createErr;
            }
        } else {
            console.error('检查Bucket失败:', err);
            throw err;
        }
    }
}

async function listBuckets() {
    try {
        // 列举当前账号所有地域下的存储空间。
        const result = await client.listBuckets();
        return result;
    } catch (err) {
        console.error('列举Bucket失败:', err);
        throw err;
    }
}

/**
 * 上传文件到OSS
 * @param {string} localFilePath 本地文件路径
 * @param {string} ossFilePath OSS存储路径
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFile(localFilePath, ossFilePath) {
    try {
        // 上传文件到OSS
        const result = await client.put(ossFilePath, localFilePath, {
            timeout: 300000, // 5分钟超时
            headers: {
                'x-oss-storage-class': 'Standard'
            }
        });
        
        return result;
    } catch (err) {
        console.error(`上传文件失败: ${ossFilePath}`, err.message);
        throw err;
    }
}

/**
 * 从OSS下载文件
 * @param {string} ossFilePath OSS文件路径
 * @param {string} localFilePath 本地保存路径
 * @returns {Promise<Object>} 下载结果
 */
async function downloadFile(ossFilePath, localFilePath) {
    try {
        const result = await client.get(ossFilePath, localFilePath);
        return result;
    } catch (err) {
        console.error('下载文件失败:', err);
        throw err;
    }
}

/**
 * 获取文件访问URL
 * @param {string} ossFilePath OSS文件路径
 * @param {number} expireTime URL过期时间（秒）
 * @returns {string} 文件访问URL
 */
function getFileUrl(ossFilePath, expireTime = 3600) {
    try {
        // 生成签名URL
        const url = client.signatureUrl(ossFilePath, { expires: expireTime });
        return url;
    } catch (err) {
        console.error('获取文件访问URL失败:', err);
        throw err;
    }
}

/**
 * 删除OSS中的文件
 * @param {string} ossFilePath OSS文件路径
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFile(ossFilePath) {
    try {
        const result = await client.delete(ossFilePath);
        return result;
    } catch (err) {
        console.error('删除文件失败:', err);
        throw err;
    }
}

/**
 * 从OSS获取文件内容到Buffer
 * @param {string} ossFilePath OSS文件路径
 * @returns {Promise<Buffer>} 文件内容Buffer
 */
async function getFileBuffer(ossFilePath) {
    try {
        const result = await client.get(ossFilePath);
        if (result && result.content) {
            return result.content;
        }
        throw new Error('获取文件内容失败，返回的内容为空');
    } catch (err) {
        console.error('从OSS获取文件内容失败:', err);
        throw err;
    }
}

module.exports = {
    client,
    listBuckets,
    uploadFile,
    downloadFile,
    getFileUrl,
    deleteFile,
    ensureBucketExists,
    getFileBuffer
};