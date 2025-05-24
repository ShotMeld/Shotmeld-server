const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const tagSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4() // 使用UUID作为主键
  },
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  user: {
    type: String,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id; // 确保返回id字段
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 更新时自动更新updatedAt字段
tagSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// 创建虚拟字段photoCount
tagSchema.virtual('photoCount').get(function() {
  return this._photoCount || 0;
});

tagSchema.virtual('photoCount').set(function(count) {
  this._photoCount = count;
});

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;
