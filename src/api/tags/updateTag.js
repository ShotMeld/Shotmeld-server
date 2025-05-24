const Tag = require('../../models/Tag');
const Photo = require('../../models/Photo');

/**
 * 更新标签名称
 */
async function updateTag(req, res, next) {
  try {
    const { tagId } = req.params;
    const { name } = req.body;

    // 验证必须提供新的标签名称
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        message: '必须提供有效的标签名称'
      });
    }

    // 查找要更新的标签
    const tag = await Tag.findOne({
      _id: tagId,
      user: req.user.id
    });

    if (!tag) {
      return res.status(404).json({
        message: '标签不存在'
      });
    }

    // 检查新名称是否与其他标签冲突
    const existingTag = await Tag.findOne({
      name: name,
      user: req.user.id,
      _id: { $ne: tagId }
    });

    if (existingTag) {
      return res.status(409).json({
        message: '标签名称已存在'
      });
    }

    // 保存旧名称用于更新照片
    const oldName = tag.name;

    // 更新标签名称
    tag.name = name;
    await tag.save();

    // 更新所有使用这个标签的照片
    await Photo.updateMany(
      { user: req.user.id, tags: oldName },
      { $set: { 'tags.$[oldTag]': name } },
      { arrayFilters: [{ oldTag: oldName }] }
    );

    // 返回更新后的标签信息
    res.status(200).json(tag);
  } catch (error) {
    next(error);
  }
}

module.exports = updateTag;
