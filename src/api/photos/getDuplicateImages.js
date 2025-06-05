const { findDuplicateImages } = require('../../utils/imageComparator');

module.exports = async (req, res) => {
    try {
        const duplicates = await findDuplicateImages();

        // 确保返回JSON格式
        res.status(200).json({
            success: true,
            data: duplicates,
            message: 'Success'
        });

    } catch (error) {
        // 错误时也返回JSON
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};