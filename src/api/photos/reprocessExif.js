/**
 * 重新解析照片的EXIF信息
 */
const path = require('path');
const fs = require('fs-extra');
const Photo = require('../../models/Photo');
const { parseExifFromFile } = require('../../utils/exif');
const { photoDir, ossPhotoPath } = require('../../config/upload');
const { getFileBuffer } = require('../../utils/oss');

/**
 * 重新解析照片的EXIF信息并更新到数据库
 */
async function reprocessExif(req, res, next) {
  try {
    const { photoId } = req.params;

    // 获取照片信息
    const photo = await Photo.findById(photoId);
    if (!photo) {
      return res.status(404).json({
        code: 404,
        message: '照片不存在'
      });
    }

    // 检查权限 - 只允许照片的所有者操作
    if (photo.user.toString() !== req.user.id) {
      return res.status(403).json({
        code: 403,
        message: '无权操作该照片'
      });
    }

    // 构建照片的本地路径和OSS路径
    const localPhotoPath = path.join(photoDir, photo.filename);
    const ossFilePath = `${ossPhotoPath}${photo.filename}`;
    
    let fileBuffer = null;
    
    // 先尝试从本地获取文件
    if (fs.existsSync(localPhotoPath)) {
      console.log('从本地文件解析EXIF数据');
      fileBuffer = await fs.readFile(localPhotoPath);
    } else {
      // 本地文件不存在，从OSS获取
      console.log('从OSS获取文件并解析EXIF数据');
      try {
        fileBuffer = await getFileBuffer(ossFilePath);
      } catch (ossError) {
        return res.status(404).json({
          code: 404,
          message: '无法从OSS获取照片文件，请检查文件是否存在'
        });
      }
    }

    // 确认文件获取成功
    if (!fileBuffer) {
      return res.status(404).json({
        code: 404,
        message: '无法获取照片文件数据'
      });
    }

    // 解析EXIF信息
    const exifData = await parseExifFromFile(fileBuffer);
    if (!exifData) {
      return res.status(404).json({
        code: 404,
        message: '未能从照片中提取到EXIF信息'
      });
    }

    // 更新拍摄时间
    let updateData = {
      'metadata.exif': exifData
    };

    // 如果有拍摄时间，更新takenAt
    if (exifData.dateTimeOriginal) {
      updateData.takenAt = exifData.dateTimeOriginal;
    }

    // 如果有GPS信息，更新位置
    if (exifData.gpsLatitude && exifData.gpsLongitude) {
      updateData.location = {
        latitude: exifData.gpsLatitude,
        longitude: exifData.gpsLongitude,
        name: photo.location ? photo.location.name : null // 保留原有的位置名称
      };
    }

    // 更新照片信息
    const updatedPhoto = await Photo.findByIdAndUpdate(
      photoId,
      { $set: updateData },
      { new: true }
    );

    res.json(updatedPhoto);
  } catch (error) {
    next(error);
  }
}

module.exports = reprocessExif;
