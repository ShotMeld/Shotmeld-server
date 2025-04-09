const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');
const { authenticate } = require('../middlewares/auth');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取相册列表 - GET /albums
router.get('/', albumController.getAlbums);

// 创建新相册 - POST /albums
router.post('/', albumController.createAlbum);

// 获取相册详情 - GET /albums/:albumId
router.get('/:albumId', albumController.getAlbumById);

// 更新相册 - PUT /albums/:albumId
router.put('/:albumId', albumController.updateAlbum);

// 删除相册 - DELETE /albums/:albumId
router.delete('/:albumId', albumController.deleteAlbum);

// 获取相册中的照片 - GET /albums/:albumId/photos
router.get('/:albumId/photos', albumController.getAlbumPhotos);

// 添加照片到相册 - POST /albums/:albumId/photos/:photoId
router.post('/:albumId/photos/:photoId', albumController.addPhotoToAlbum);

// 从相册中移除照片 - DELETE /albums/:albumId/photos/:photoId
router.delete('/:albumId/photos/:photoId', albumController.removePhotoFromAlbum);

module.exports = router;