const Tag = require('../../models/Tag');
const Photo = require('../../models/Photo');

/**
 * 删除标签
 */
async function deleteTag(req, res, next) {
  try {
    const { tagId } = req.params;

    // 查找要删除的标签
    const tag = await Tag.findOne({
      _id: tagId,
      user: req.user.id
    });

    if (!tag) {
      return res.status(404).json({
        message: '标签不存在'
      });
    }

    // 获取标签名称
    const tagName = tag.name;

    // 从所有照片中删除此标签
    await Photo.updateMany(
      { user: req.user.id, tags: tagName },
      { $pull: { tags: tagName } }
    );

    // 删除标签
    await Tag.findByIdAndDelete(tagId);

    // 返回成功但不包含内容
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = deleteTag;
