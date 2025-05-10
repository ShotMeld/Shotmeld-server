const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4() // 使用UUID作为主键
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
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
    transform: (doc, ret) => {
      ret.id = ret._id; // 确保返回id字段
      delete ret._id; // 移除_id字段
      delete ret.password; // 确保不返回密码
      delete ret.__v;
      return ret;
    }
  }
});

// 在保存前对密码进行哈希处理
userSchema.pre('save', async function(next) {
  // 只有当密码被修改或新创建时才进行哈希
  if (!this.isModified('password')) return next();
  
  try {
    // 生成盐并使用盐对密码进行哈希处理
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 添加比较密码的方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;