const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middlewares/auth');
const { upload } = require('../config/upload');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取照片列表 - GET /photos
router.get('/', photoController.getPhotos);

// 上传新照片 - POST /photos
router.post('/', upload.single('photo'), photoController.uploadPhoto);

// 批量上传照片 - POST /photos/batch
router.post('/batch', upload.array('photos', 20), photoController.batchUpload);

// 获取照片详情 - GET /photos/:photoId
router.get('/:photoId', photoController.getPhotoById);

// 更新照片信息 - PUT /photos/:photoId
router.put('/:photoId', photoController.updatePhoto);

// 删除照片 - DELETE /photos/:photoId
router.delete('/:photoId', photoController.deletePhoto);

module.exports = router;