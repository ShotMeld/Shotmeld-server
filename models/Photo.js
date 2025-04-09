const mongoose = require('mongoose');

// 地理位置模式
const geoLocationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true  // 纬度
  },
  longitude: {
    type: Number,
    required: true  // 经度
  },
  name: {
    type: String,
    default: ''  // 位置名称
  }
}, { _id: false });

// 照片模式
const photoSchema = new mongoose.Schema({
  title: {
    type: String,
    default: ''  // 标题
  },
  description: {
    type: String,
    default: ''  // 描述
  },
  filename: {
    type: String,
    required: true  // 文件名
  },
  fileSize: {
    type: Number,
    required: true  // 文件大小
  },
  mimeType: {
    type: String,
    required: true  // 媒体类型
  },
  width: {
    type: Number,
    required: true  // 宽度
  },
  height: {
    type: Number,
    required: true  // 高度
  },
  url: {
    type: String,
    required: true  // 图片URL
  },
  thumbnailUrl: {
    type: String,
    required: true  // 缩略图URL
  },
  takenAt: {
    type: Date,
    default: Date.now  // 拍摄时间
  },
  location: {
    type: geoLocationSchema,
    default: null  // 拍摄地点
  },
  metadata: {
    type: Object,
    default: {}  // 元数据
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // 所属用户
  },
  albums: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album'  // 所属相册
  }],
  tags: [{
    type: String,
    trim: true  // 标签
  }],
  createdAt: {
    type: Date,
    default: Date.now  // 创建时间
  },
  updatedAt: {
    type: Date,
    default: Date.now  // 更新时间
  }
});

// 更新时自动更新updatedAt字段
photoSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// 配置toJSON转换
photoSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Photo = mongoose.model('Photo', photoSchema);

module.exports = Photo;