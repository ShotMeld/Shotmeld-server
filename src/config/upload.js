const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '..', 'uploads');
const tempDir = path.join(uploadDir, 'temp'); // 临时目录，上传到OSS后可删除
const photoDir = path.join(uploadDir, 'photos'); // 保留本地目录作为备份
const thumbnailDir = path.join(uploadDir, 'thumbnails');

// OSS存储路径
const ossPhotoPath = 'photos/';
const ossThumbnailPath = 'thumbnails/';

// 创建必要的目录
fs.ensureDirSync(tempDir);
fs.ensureDirSync(photoDir);
fs.ensureDirSync(thumbnailDir);

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir); // 先保存到临时目录
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名，保留原始扩展名
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// 文件过滤器，只接受图片文件
const fileFilter = (req, file, cb) => {
  // 接受的图片类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heif', 'image/heic'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。只允许JPG, PNG, GIF, WEBP和HEIF/HEIC格式的图片'), false);
  }
};

// 文件大小限制(20MB)
const limits = {
  fileSize: 20 * 1024 * 1024
};

// 创建multer实例
const upload = multer({
  storage,
  fileFilter,
  limits
});

module.exports = {
  upload,
  tempDir,
  photoDir,
  thumbnailDir,
  ossPhotoPath,
  ossThumbnailPath
};