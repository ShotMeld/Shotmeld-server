const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');
const { upload } = require('../../config/upload');

// 引入各个路由处理函数
const getPhotos = require('./getPhotos');
const uploadPhoto = require('./uploadPhoto');
const batchUpload = require('./batchUpload');
const getPhotoById = require('./getPhotoById');
const updatePhoto = require('./updatePhoto');
const deletePhotos = require('./deletePhotos');
const reprocessExif = require('./reprocessExif');
const generateTags = require('./generateTags');
const searchPhotos = require('./searchPhotos');
const semanticSearchPhotos = require('./semanticSearchPhotos');
const sharePhoto = require('./sharePhoto');
const getSharedPhoto = require('./getSharedPhoto');

// 无需认证的路由
// 获取共享照片 - GET /photos/shared/:photoId
router.get('/shared/:photoId', getSharedPhoto);

// 对所有其他路由应用认证中间件
router.use(authenticate);

// 获取照片列表 - GET /photos
router.get('/', getPhotos);

// 综合搜索照片（标题、标签、地点） - GET /photos/search
router.get('/search', searchPhotos);

// 语义高级搜索照片（包含AI语义标签匹配） - GET /photos/semantic-search
router.get('/semantic-search', semanticSearchPhotos);

// 上传新照片 - POST /photos
router.post('/', upload.single('photo'), uploadPhoto);

// 批量上传照片 - POST /photos/batch
router.post('/batch', upload.array('photos', 20), batchUpload);

// 获取照片详情 - GET /photos/:photoId
router.get('/:photoId', getPhotoById);

// 更新照片信息 - PUT /photos/:photoId
router.put('/:photoId', updatePhoto);

// 设置照片为可分享 - POST /photos/share/:photoId
router.post('/share/:photoId', sharePhoto);

// 重新处理照片的EXIF信息 - POST /photos/:photoId/exif
router.post('/:photoId/exif', reprocessExif);

// 为照片生成自动标签 - POST /photos/:photoId/tags/generate
router.post('/:photoId/tags/generate', generateTags);

// 批量删除照片 - DELETE /photos
router.delete('/', deletePhotos);

module.exports = router;
