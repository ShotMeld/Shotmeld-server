const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// 地理位置模式
const geoLocationSchema = new mongoose.Schema({
  latitude: {
    type: Number,
    required: true,  // 纬度
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: true,  // 经度
    min: -180,
    max: 180
  },
  name: {
    type: String,
    default: null  // 位置名称
  }
}, { _id: false });

// 照片模式
const photoSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4() // 使用UUID作为主键
  },
  title: {
    type: String,
    default: null  // 标题
  },
  description: {
    type: String,
    default: null  // 描述
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
    default: null  // 宽度
  },
  height: {
    type: Number,
    default: null  // 高度
  },
  url: {
    type: String,
    required: true  // 图片URL
  },
  thumbnailUrl: {
    type: String,
    default: null  // 缩略图URL
  },
  takenAt: {
    type: Date,
    default: null  // 拍摄时间
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
    type: String,
    ref: 'User',
    required: true  // 所属用户
  },
  albums: [{
    type: String,
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
}, {
  toJSON: {
    transform: (doc, ret) => {
      ret.id = ret._id; // 确保返回id字段
      delete ret._id;
      delete ret.__v;
      return ret;
    }
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