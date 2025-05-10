const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const albumSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4() // 使用UUID作为主键
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: null
  },
  coverPhotoId: {
    type: String,
    ref: 'Photo',
    default: null
  },
  user: {
    type: String,
    ref: 'User',
    required: true
  },
  photos: [{
    type: String,
    ref: 'Photo'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
},
{
  toJSON: {
    virtuals: true, // 确保虚拟字段在JSON中可见
    transform: (doc, ret) => {
      ret.id = ret._id; // 确保返回id字段
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 更新时自动更新updatedAt字段
albumSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// 创建虚拟字段photoCount，返回相册中的照片数量
albumSchema.virtual('photoCount').get(function() {
  return this.photos ? this.photos.length : 0;
});

// 配置虚拟字段在JSON序列化时可见
albumSchema.set('toJSON', { 
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

albumSchema.set('toObject', { virtuals: true });

const Album = mongoose.model('Album', albumSchema);

module.exports = Album;