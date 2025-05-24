const jwt = require('jsonwebtoken');
const config = require('../../config/config');

/**
 * 生成JWT令牌
 * @param {string} userId - 用户ID
 * @returns {string} JWT令牌
 */
function generateToken(userId) {
  return jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: '7d' // 令牌7天内有效
  });
}

module.exports = {
  generateToken
};
