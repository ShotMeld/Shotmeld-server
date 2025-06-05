/**
 * 获取图库中所有重复照片的UUID列表
 * 基于ThumbHash值判断照片是否重复
 * 
 * @returns {Array} 包含重复照片UUID的数组，每个子数组代表一组重复照片
 */
async function findDuplicateImages() {
    try {
        const imageLibrary = await getImageLibrary();
        const hashMap = {}; // 用于存储ThumbHash到照片UUID的映射

        // 首先按ThumbHash分组
        for (const image of imageLibrary) {
            const thumbHash = image.metadata?.thumbHash;
            if (!thumbHash) continue;

            if (!hashMap[thumbHash]) {
                hashMap[thumbHash] = [];
            }

            // 假设每个图片对象都有uuid属性
            hashMap[thumbHash].push(image.uuid || image.id);
        }

        // 筛选出重复的照片组（ThumbHash对应2个及以上UUID）
        const duplicates = [];
        for (const [thumbHash, uuids] of Object.entries(hashMap)) {
            if (uuids.length >= 2) {
                duplicates.push(uuids);
            }
        }

        return duplicates;
    } catch (error) {
        console.error('查找重复图片时出错:', error);
        throw error;
    }
}

/**
 * 简化版API - 获取重复照片的UUID列表
 * @returns {Array} 包含重复照片UUID的数组，每个子数组代表一组重复照片
 */
async function getDuplicateImagesAPI() {
    return await findDuplicateImages();
}

// 导出函数以便其他模块使用
module.exports = {
    getDuplicateImagesAPI
};

// 如果直接在浏览器中使用，可以挂载到window对象
if (typeof window !== 'undefined') {
    window.DuplicateImageFinder = {
        getDuplicateImagesAPI
    };
}