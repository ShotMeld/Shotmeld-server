/**
 * 基于ThumbHash比较图片相似度
 * 通过计算ThumbHash之间的汉明距离找出图库中与选中图片相似的图片
 * 
 * 假设：
 * 1. 图片的ThumbHash值存储在metadata中，属性名为'thumbHash'
 * 2. ThumbHash是Base64编码的字符串
 * 3. 需要将Base64解码为二进制数据后再比较
 */

/**
 * 将Base64字符串转换为Uint8Array
 * @param {string} base64 - Base64编码的字符串
 * @returns {Uint8Array} 解码后的二进制数据
 */
function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * 计算两个ThumbHash之间的汉明距离
 * @param {string} thumbHash1 - 第一个图片的ThumbHash (Base64)
 * @param {string} thumbHash2 - 第二个图片的ThumbHash (Base64)
 * @returns {number} 汉明距离
 */
function calculateThumbHashDistance(thumbHash1, thumbHash2) {
    if (!thumbHash1 || !thumbHash2) {
        throw new Error('缺少ThumbHash值');
    }

    const bytes1 = base64ToUint8Array(thumbHash1);
    const bytes2 = base64ToUint8Array(thumbHash2);

    if (bytes1.length !== bytes2.length) {
        throw new Error('ThumbHash长度不匹配');
    }

    let distance = 0;
    for (let i = 0; i < bytes1.length; i++) {
        let xor = bytes1[i] ^ bytes2[i];
        while (xor > 0) {
            distance += xor & 1;
            xor >>= 1;
        }
    }
    return distance;
}

/**
 * 从图库中获取所有图片数据
 * @returns {Array} 包含图片对象的数组，每个对象有metadata属性包含thumbHash
 */
async function getImageLibrary() {
    // 实际应用中，这里可能是从数据库、API或文件系统获取数据
    // 这里只是示例，返回一个空数组
    return [];
}

/**
 * 找出图库中与选中图片相似的图片
 * @param {string} selectedThumbHash - 选中图片的ThumbHash (Base64)
 * @param {number} [threshold=10] - 相似度阈值，汉明距离小于等于此值的视为相似
 * @returns {Array} 包含相似图片信息的数组，按相似度排序
 */
async function findSimilarImagesByThumbHash(selectedThumbHash, threshold = 10) {
    if (!selectedThumbHash) {
        throw new Error('未提供选中图片的ThumbHash');
    }

    const imageLibrary = await getImageLibrary();
    const similarImages = [];

    for (const image of imageLibrary) {
        try {
            const libraryThumbHash = image.metadata?.thumbHash;
            if (!libraryThumbHash) continue;

            const distance = calculateThumbHashDistance(selectedThumbHash, libraryThumbHash);

            if (distance <= threshold) {
                similarImages.push({
                    imageId: image.id || '未知ID',
                    imageName: image.name || '未命名',
                    hammingDistance: distance,
                    metadata: image.metadata,
                    imageData: image // 包含完整的图片数据（根据需要调整）
                });
            }
        } catch (error) {
            console.error(`处理图片时出错: ${image.id || '未知图片'}`, error);
        }
    }

    // 按汉明距离从小到大排序（距离越小越相似）
    similarImages.sort((a, b) => a.hammingDistance - b.hammingDistance);

    return similarImages;
}

/**
 * 主函数 - 比较选中图片与图库中的图片相似度（基于ThumbHash）
 * @param {string} selectedThumbHash - 选中图片的ThumbHash (Base64)
 * @param {number} [threshold=10] - 相似度阈值
 */
async function compareThumbHashSimilarity(selectedThumbHash, threshold) {
    try {
        console.log('开始基于ThumbHash比较图片相似度...');
        console.log(`选中图片ThumbHash: ${selectedThumbHash}`);

        const similarImages = await findSimilarImagesByThumbHash(selectedThumbHash, threshold);

        console.log(`找到 ${similarImages.length} 张相似图片:`);
        similarImages.forEach((img, index) => {
            console.log(`#${index + 1}: ID=${img.imageId}, 名称=${img.imageName}, 汉明距离=${img.hammingDistance}`);
        });

        return similarImages;
    } catch (error) {
        console.error('比较图片相似度时出错:', error);
        throw error;
    }
}

// 导出函数以便其他模块使用
module.exports = {
    base64ToUint8Array,
    calculateThumbHashDistance,
    findSimilarImagesByThumbHash,
    compareThumbHashSimilarity
};

// 如果直接在浏览器中使用，可以挂载到window对象
if (typeof window !== 'undefined') {
    window.ThumbHashComparator = {
        base64ToUint8Array,
        calculateThumbHashDistance,
        findSimilarImagesByThumbHash,
        compareThumbHashSimilarity
    };
}