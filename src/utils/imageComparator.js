const Photo = require('../models/Photo'); // 修正后的路径

async function findDuplicateImages(threshold = 2) {
    const photos = await Photo.find().select('uuid thumbHash');
    const hashMap = {};

    photos.forEach(photo => {
        if (!photo.thumbHash) return;
        hashMap[photo.thumbHash] = hashMap[photo.thumbHash] || [];
        hashMap[photo.thumbHash].push(photo.uuid);
    });

    return Object.values(hashMap)
        .filter(group => group.length >= threshold);
}

module.exports = { findDuplicateImages };