const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/auth');

// 引入各个路由处理函数
const getAlbums = require('./getAlbums');
const createAlbum = require('./createAlbum');
const getAlbumById = require('./getAlbumById');
const updateAlbum = require('./updateAlbum');
const deleteAlbum = require('./deleteAlbum');
const getAlbumPhotos = require('./getAlbumPhotos');
const addPhotoToAlbum = require('./addPhotoToAlbum');
const removePhotoFromAlbum = require('./removePhotoFromAlbum');

// 对所有路由应用认证中间件
router.use(authenticate);

// 获取相册列表 - GET /albums
router.get('/', getAlbums);

// 创建新相册 - POST /albums
router.post('/', createAlbum);

// 获取相册详情 - GET /albums/:albumId
router.get('/:albumId', getAlbumById);

// 更新相册 - PUT /albums/:albumId
router.put('/:albumId', updateAlbum);

// 删除相册 - DELETE /albums/:albumId
router.delete('/:albumId', deleteAlbum);

// 获取相册中的照片 - GET /albums/:albumId/photos
router.get('/:albumId/photos', getAlbumPhotos);

// 批量添加照片到相册 - POST /albums/:albumId/photos
router.post('/:albumId/photos', addPhotoToAlbum);

// 从相册中批量移除照片 - DELETE /albums/:albumId/photos
router.delete('/:albumId/photos', removePhotoFromAlbum);

module.exports = router;

