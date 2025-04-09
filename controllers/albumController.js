const Album = require('../models/Album');
const Photo = require('../models/Photo');
const mongoose = require('mongoose');

/**
 * 获取相册列表
 */
exports.getAlbums = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 验证排序参数
    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 查询当前用户的所有相册
    const query = { user: req.user.id };
    
    // 统计符合条件的文档总数
    const total = await Album.countDocuments(query);
    
    // 获取分页数据
    const albums = await Album.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数
    const totalPages = Math.ceil(total / limitNum);
    
    // 返回分页结果
    res.status(200).json({
      data: albums,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建新相册
 */
exports.createAlbum = async (req, res, next) => {
  try {
    const { name, description, coverPhotoId } = req.body;
    
    // 检查是否已存在同名相册
    const existingAlbum = await Album.findOne({ name, user: req.user.id });
    if (existingAlbum) {
      return res.status(400).json({
        code: 400,
        message: '已存在同名相册，请使用其他名称'
      });
    }
    
    // 创建新相册
    const album = new Album({
      name,
      description,
      coverPhotoId: coverPhotoId || null,
      user: req.user.id,
      photos: []
    });
    
    // 保存相册
    await album.save();
    
    // 如果指定了封面照片，确保它存在
    if (coverPhotoId) {
      const photo = await Photo.findOne({ _id: coverPhotoId, user: req.user.id });
      if (photo) {
        // 将相册ID添加到照片的albums数组中
        if (!photo.albums.includes(album._id)) {
          photo.albums.push(album._id);
          await photo.save();
        }
      }
    }
    
    // 返回创建的相册
    res.status(201).json(album);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 400,
        message: '相册数据无效',
        details: error.message
      });
    }
    next(error);
  }
};

/**
 * 获取单个相册详情
 */
exports.getAlbumById = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 返回相册详情
    res.status(200).json(album);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新相册信息
 */
exports.updateAlbum = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { name, description, coverPhotoId } = req.body;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 更新相册属性
    if (name) album.name = name;
    if (description !== undefined) album.description = description;
    
    // 如果更换了封面照片
    if (coverPhotoId !== undefined && coverPhotoId !== album.coverPhotoId) {
      // 设置新的封面照片
      album.coverPhotoId = coverPhotoId || null;
      
      // 如果指定了新的封面照片，确保照片存在并与相册关联
      if (coverPhotoId) {
        const photo = await Photo.findOne({ _id: coverPhotoId, user: req.user.id });
        if (photo) {
          // 将相册ID添加到照片的albums数组中
          if (!photo.albums.includes(album._id)) {
            photo.albums.push(album._id);
            await photo.save();
          }
        }
      }
    }
    
    // 保存更新后的相册
    await album.save();
    
    // 返回更新后的相册
    res.status(200).json(album);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 400,
        message: '相册数据无效',
        details: error.message
      });
    }
    next(error);
  }
};

/**
 * 删除相册
 */
exports.deleteAlbum = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查找相册
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 从所有相关照片中移除此相册的引用
    await Photo.updateMany(
      { albums: albumId },
      { $pull: { albums: albumId } }
    );
    
    // 删除相册
    await Album.deleteOne({ _id: albumId });
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/**
 * 获取相册中的照片
 */
exports.getAlbumPhotos = async (req, res, next) => {
  try {
    const { albumId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc' 
    } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId)) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 确认相册存在且属于当前用户
    const album = await Album.findOne({ 
      _id: albumId,
      user: req.user.id
    });
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    // 查询条件：照片必须在指定的相册中
    const query = {
      user: req.user.id,
      albums: albumId
    };
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(query);
    
    // 获取分页数据
    const photos = await Photo.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数
    const totalPages = Math.ceil(total / limitNum);
    
    // 返回分页结果
    res.status(200).json({
      data: photos,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加照片到相册
 */
exports.addPhotoToAlbum = async (req, res, next) => {
  try {
    const { albumId, photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId) || !mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '相册或照片不存在'
      });
    }
    
    // 查找相册和照片，确保它们存在且属于当前用户
    const [album, photo] = await Promise.all([
      Album.findOne({ _id: albumId, user: req.user.id }),
      Photo.findOne({ _id: photoId, user: req.user.id })
    ]);
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 检查照片是否已经在相册中
    if (!album.photos.includes(photoId)) {
      // 将照片添加到相册
      album.photos.push(photoId);
      await album.save();
    }
    
    // 检查相册是否已经在照片的相册列表中
    if (!photo.albums.includes(albumId)) {
      // 将相册添加到照片的相册列表
      photo.albums.push(albumId);
      await photo.save();
    }
    
    // 返回成功状态
    res.status(200).json({
      message: '照片已成功添加到相册'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 从相册中移除照片
 */
exports.removePhotoFromAlbum = async (req, res, next) => {
  try {
    const { albumId, photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(albumId) || !mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '相册或照片不存在'
      });
    }
    
    // 查找相册和照片，确保它们存在且属于当前用户
    const [album, photo] = await Promise.all([
      Album.findOne({ _id: albumId, user: req.user.id }),
      Photo.findOne({ _id: photoId, user: req.user.id })
    ]);
    
    if (!album) {
      return res.status(404).json({
        code: 404,
        message: '相册不存在'
      });
    }
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 从相册中移除照片
    album.photos = album.photos.filter(p => p.toString() !== photoId);
    await album.save();
    
    // 从照片的相册列表中移除相册
    photo.albums = photo.albums.filter(a => a.toString() !== albumId);
    await photo.save();
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};