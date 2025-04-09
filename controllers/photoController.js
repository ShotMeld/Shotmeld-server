const Photo = require('../models/Photo');
const Album = require('../models/Album');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { photoDir, thumbnailDir } = require('../config/upload');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

// 处理上传图片并创建缩略图
async function processUploadedPhoto(file, userId, metadata = {}) {
  try {
    // 读取图片元数据
    const imageInfo = await sharp(file.path).metadata();
    
    // 创建缩略图
    const thumbnailFilename = `thumb_${path.basename(file.path)}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
    
    // 生成缩略图 (调整大小到300px宽度)
    await sharp(file.path)
      .resize({ width: 300 })
      .toFile(thumbnailPath);
    
    // 图片的服务URL
    const baseUrl = process.env.BASE_URL || `http://120.55.78.33:${config.PORT}`;
    const photoUrl = `${baseUrl}/uploads/photos/${file.filename}`;
    const thumbnailUrl = `${baseUrl}/uploads/thumbnails/${thumbnailFilename}`;
    
    // 提取EXIF数据中的拍摄时间或使用当前时间
    let takenAt = new Date();
    if (metadata.takenAt) {
      takenAt = new Date(metadata.takenAt);
    }
    
    // 创建照片记录
    const photo = new Photo({
      title: metadata.title || file.originalname.split('.')[0], // 使用原始文件名作为默认标题
      description: metadata.description || '',
      filename: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      width: imageInfo.width,
      height: imageInfo.height,
      url: photoUrl,
      thumbnailUrl: thumbnailUrl,
      takenAt: takenAt,
      location: metadata.location || null,
      metadata: {
        ...imageInfo,
        originalName: file.originalname
      },
      user: userId,
      albums: metadata.albumIds || [],
      tags: metadata.tags || []
    });
    
    // 保存照片
    await photo.save();
    
    // 如果指定了相册，将照片添加到相册中
    if (metadata.albumIds && metadata.albumIds.length > 0) {
      for (const albumId of metadata.albumIds) {
        const album = await Album.findById(albumId);
        if (album && album.user.toString() === userId.toString()) {
          album.photos.push(photo._id);
          await album.save();
        }
      }
    }
    
    return photo;
  } catch (error) {
    // 如果处理过程中出错，删除已上传的文件
    if (file.path && fs.existsSync(file.path)) {
      await fs.unlink(file.path);
    }
    
    const thumbnailPath = path.join(thumbnailDir, `thumb_${file.filename}`);
    if (fs.existsSync(thumbnailPath)) {
      await fs.unlink(thumbnailPath);
    }
    
    throw error;
  }
}

/**
 * 获取照片列表
 */
exports.getPhotos = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sort = 'takenAt', 
      order = 'desc',
      albumId,
      tags,
      startDate,
      endDate,
      q // 搜索关键词
    } = req.query;
    
    const pageNum = parseInt(page) || 1; // 确保page不为null
    const limitNum = parseInt(limit) || 50; // 确保limit不为null
    
    // 验证排序参数
    const allowedSortFields = ['title', 'takenAt', 'createdAt'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'takenAt';
    const sortOrder = order === 'asc' ? 1 : -1;
    
    // 构建查询条件
    const query = { user: req.user.id };
    
    // 按相册过滤
    if (albumId) {
      query.albums = mongoose.Types.ObjectId.isValid(albumId) ? albumId : null;
    }
    
    // 按标签过滤
    if (tags) {
      const tagList = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagList };
    }
    
    // 按拍摄日期范围过滤
    if (startDate || endDate) {
      query.takenAt = {};
      if (startDate) {
        query.takenAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.takenAt.$lte = new Date(endDate);
      }
    }
    
    // 关键词搜索（标题、描述）
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }
    
    // 统计符合条件的照片总数
    const total = await Photo.countDocuments(query);
    
    // 获取分页数据
    const photos = await Photo.find(query)
      .sort({ [sortField]: sortOrder })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .exec();
    
    // 计算总页数，确保不为null
    const totalPages = Math.ceil(total / limitNum) || 1;
    
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
 * 上传新照片
 */
exports.uploadPhoto = async (req, res, next) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        code: 400,
        message: '未上传照片文件'
      });
    }
    
    // 解析可能作为JSON字符串提交的元数据
    let metadata = {};
    if (req.body.metadata) {
      try {
        metadata = JSON.parse(req.body.metadata);
      } catch (error) {
        return res.status(400).json({
          code: 400,
          message: '照片元数据格式无效'
        });
      }
    }
    
    // 处理上传的照片
    const photo = await processUploadedPhoto(file, req.user.id, metadata);
    
    // 返回创建的照片
    res.status(201).json(photo);
  } catch (error) {
    next(error);
  }
};

/**
 * 批量上传照片
 */
exports.batchUpload = async (req, res, next) => {
  try {
    const files = req.files;
    
    if (!files || !files.length) {
      return res.status(400).json({
        code: 400,
        message: '未上传照片文件'
      });
    }
    
    // 处理公共元数据（如相册ID和标签）
    const albumId = req.body.albumId;
    const tags = req.body.tags ? 
      (Array.isArray(req.body.tags) ? req.body.tags : [req.body.tags]) : 
      [];
    
    const uploadedPhotos = [];
    
    // 处理每张照片
    for (const file of files) {
      // 为每张照片准备元数据
      const metadata = {
        albumIds: albumId ? [albumId] : [],
        tags: tags
      };
      
      // 处理并保存照片
      const photo = await processUploadedPhoto(file, req.user.id, metadata);
      uploadedPhotos.push(photo);
    }
    
    // 返回上传结果
    res.status(201).json({
      uploadedCount: uploadedPhotos.length,
      photos: uploadedPhotos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个照片详情
 */
exports.getPhotoById = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 查找照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      user: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 返回照片详情
    res.status(200).json(photo);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新照片信息
 */
exports.updatePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    const { title, description, albumIds, tags } = req.body;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 查找照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      user: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 更新照片属性
    if (title !== undefined) photo.title = title;
    if (description !== undefined) photo.description = description;
    if (tags !== undefined) photo.tags = tags;
    
    // 如果提供了相册IDs，更新照片和相册的关联关系
    if (albumIds !== undefined) {
      // 获取当前照片所在的所有相册
      const currentAlbumIds = photo.albums.map(id => id.toString());
      
      // 要添加的新相册IDs
      const albumIdsToAdd = albumIds.filter(id => 
        mongoose.Types.ObjectId.isValid(id) && !currentAlbumIds.includes(id)
      );
      
      // 要移除的相册IDs
      const albumIdsToRemove = currentAlbumIds.filter(id => 
        !albumIds.includes(id)
      );
      
      // 为要添加的相册添加该照片
      for (const albumId of albumIdsToAdd) {
        const album = await Album.findOne({ _id: albumId, user: req.user.id });
        if (album) {
          album.photos.push(photo._id);
          await album.save();
        }
      }
      
      // 从要移除的相册中移除该照片
      for (const albumId of albumIdsToRemove) {
        const album = await Album.findOne({ _id: albumId, user: req.user.id });
        if (album) {
          album.photos = album.photos.filter(id => id.toString() !== photoId);
          await album.save();
        }
      }
      
      // 更新照片的相册列表
      photo.albums = albumIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    }
    
    // 保存更新后的照片
    await photo.save();
    
    // 返回更新后的照片
    res.status(200).json(photo);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        code: 400,
        message: '照片数据无效',
        details: error.message
      });
    }
    next(error);
  }
};

/**
 * 删除照片
 */
exports.deletePhoto = async (req, res, next) => {
  try {
    const { photoId } = req.params;
    
    // 验证ID格式
    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 查找照片
    const photo = await Photo.findOne({ 
      _id: photoId,
      user: req.user.id
    });
    
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }
    
    // 从所有相册中移除此照片的引用
    await Album.updateMany(
      { photos: photoId },
      { $pull: { photos: photoId } }
    );
    
    // 删除文件系统中的照片文件和缩略图
    const photoPath = path.join(photoDir, photo.filename);
    const thumbnailFilename = `thumb_${photo.filename}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);
    
    // 删除照片文件
    if (fs.existsSync(photoPath)) {
      await fs.unlink(photoPath);
    }
    
    // 删除缩略图文件
    if (fs.existsSync(thumbnailPath)) {
      await fs.unlink(thumbnailPath);
    }
    
    // 删除照片记录
    await Photo.deleteOne({ _id: photoId });
    
    // 返回成功状态（无内容）
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

/**
 * 获取照片时间轴
 */
exports.getTimeline = async (req, res, next) => {
  try {
    const { 
      groupBy = 'month', 
      startDate, 
      endDate 
    } = req.query;
    
    // 构建查询条件
    const query = { user: req.user.id };
    
    // 按拍摄日期范围过滤
    if (startDate || endDate) {
      query.takenAt = {};
      if (startDate) {
        query.takenAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.takenAt.$lte = new Date(endDate);
      }
    }
    
    // 获取照片列表
    const photos = await Photo.find(query).sort({ takenAt: -1 });
    
    // 按照指定方式对照片进行分组
    const timeline = {};
    
    for (const photo of photos) {
      const takenAt = new Date(photo.takenAt);
      let dateKey;
      
      // 根据groupBy参数确定日期格式
      switch(groupBy) {
        case 'year':
          dateKey = takenAt.getFullYear().toString();
          break;
        case 'month':
          // 格式：YYYY-MM（例如：2024-04）
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        case 'day':
          // 格式：YYYY-MM-DD（例如：2024-04-08）
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}-${takenAt.getDate().toString().padStart(2, '0')}`;
          break;
        default:
          dateKey = `${takenAt.getFullYear()}-${(takenAt.getMonth() + 1).toString().padStart(2, '0')}`;
      }
      
      if (!timeline[dateKey]) {
        timeline[dateKey] = {
          date: dateKey,
          count: 0,
          photos: []
        };
      }
      
      timeline[dateKey].photos.push(photo);
      timeline[dateKey].count++;
    }
    
    // 将对象转换为数组并按日期排序
    const timelineArray = Object.values(timeline).sort((a, b) => {
      // 按日期降序排序（最近的日期在前）
      return b.date.localeCompare(a.date);
    });
    
    res.status(200).json(timelineArray);
  } catch (error) {
    next(error);
  }
};