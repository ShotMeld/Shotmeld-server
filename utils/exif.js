/**
 * 工具函数，用于解析图片的EXIF信息
 */
const fs = require('fs');
const ExifParser = require('exif-parser');
const Photo = require('../models/Photo');
const axios = require('axios'); // 添加axios
const config = require('../config/config'); // 引入配置文件

/**
 * 将时间戳转换为北京时间（UTC+8）
 * @param {number} timestamp - Unix时间戳（秒）
 * @returns {Date} - 北京时间
 */
function convertToBeijingTime(timestamp) {
  const date = new Date(timestamp * 1000);
  // 获取UTC时间
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  // 转换为北京时间（UTC+8）
  return new Date(utc + (3600000 * 8));
}

/**
 * 将EXIF时间戳（假定为北京时间）转为UTC时间（Date对象）
 * @param {number} timestamp - Unix时间戳（秒）
 * @returns {Date} - UTC时间
 */
function exifToUTCDate(timestamp) {
  if (!timestamp) return null;
  const localDate = new Date(timestamp * 1000);
  // 减去8小时，得到真正的 UTC 时间
  localDate.setHours(localDate.getHours() - 8);
  return localDate;
}

/**
 * 从图片文件解析EXIF数据
 * @param {string|Buffer} input - 图片文件的路径或buffer数据
 * @returns {Object|null} - 解析后的EXIF数据对象或null（如果解析失败）
 */
async function parseExifFromFile(input) {
  try {
    let buffer;
    
    // 判断输入是文件路径还是Buffer
    if (typeof input === 'string') {
      // 如果是文件路径
      if (!fs.existsSync(input)) {
        console.error(`文件不存在: ${input}`);
        return null;
      }
      
      // 读取文件的前64KB，通常足够包含所有EXIF数据
      buffer = Buffer.alloc(65635);
      const fd = await fs.promises.open(input, 'r');
      await fd.read(buffer, 0, 65635, 0);
      await fd.close();
    } else if (Buffer.isBuffer(input)) {
      // 如果已经是Buffer
      buffer = input;
    } else {
      throw new Error('无效的输入类型，必须是文件路径或Buffer');
    }
    
    // 使用exif-parser解析EXIF数据
    try {
      const parser = ExifParser.create(buffer);
      const result = parser.parse();

      return {
        // 基本EXIF信息
        make: result.tags.Make,
        model: result.tags.Model,
        software: result.tags.Software,
        
        // 时间信息 - 存储为UTC
        dateTimeOriginal: result.tags.DateTimeOriginal 
          ? exifToUTCDate(result.tags.DateTimeOriginal)
          : null,
        dateTimeDigitized: result.tags.DateTimeDigitized 
          ? exifToUTCDate(result.tags.DateTimeDigitized)
          : null,
        
        // 相机设置
        exposureTime: result.tags.ExposureTime,
        fNumber: result.tags.FNumber,
        isoSpeedRatings: result.tags.ISO,
        focalLength: result.tags.FocalLength,
        
        // GPS信息
        gpsLatitude: result.tags.GPSLatitude,
        gpsLongitude: result.tags.GPSLongitude,
        gpsAltitude: result.tags.GPSAltitude,
        
        // 图像信息
        orientation: result.tags.Orientation,
        
        // 原始EXIF数据（完整保存）
        rawExif: result.tags
      };
    } catch (exifError) {
      // 如果标准的EXIF解析失败，可能是HEIF/HEIC格式，尝试使用Sharp获取元数据
      try {
        // 使用Sharp获取更多元数据
        console.log('标准EXIF解析失败，尝试使用Sharp解析');
        return {
          // 这里返回一个最小的元数据对象
          make: null,
          model: null,
          software: null,
          dateTimeOriginal: null,
          dateTimeDigitized: null,
          exposureTime: null,
          fNumber: null,
          isoSpeedRatings: null,
          focalLength: null,
          gpsLatitude: null,
          gpsLongitude: null,
          gpsAltitude: null,
          orientation: null,
          rawExif: {},
          parseMethod: 'sharp' // 标记使用的解析方法
        };
      } catch (sharpError) {
        console.error('使用Sharp解析EXIF数据失败:', sharpError);
        return null;
      }
    }
  } catch (error) {
    console.error('解析EXIF数据失败:', error);
    return null;
  }
}

/**
 * 更新照片的EXIF数据到MongoDB
 * @param {string} photoId - 照片ID
 * @param {string} filePath - 图片文件的路径
 * @returns {boolean} - 更新是否成功
 */
async function updatePhotoExif(photoId, filePath) {
  try {
    // 解析EXIF数据
    const exifData = await parseExifFromFile(filePath);
    if (!exifData) {
      console.log(`没有从${filePath}找到EXIF数据`);
      return false;
    }

    // 准备要更新的数据
    const updateData = {
      // 如果有拍摄时间，更新takenAt字段
      ...(exifData.dateTimeOriginal && { takenAt: exifData.dateTimeOriginal }),
      
      // 如果有GPS信息，更新location字段
      ...(exifData.gpsLatitude && exifData.gpsLongitude && {
        location: {
          type: 'Point',
          coordinates: [exifData.gpsLongitude, exifData.gpsLatitude],
          altitude: exifData.gpsAltitude || 0
        }
      }),
      
      // 更新metadata中的exif字段
      'metadata.exif': exifData
    };

    // 更新MongoDB中的照片文档
    const result = await Photo.findByIdAndUpdate(
      photoId,
      { $set: updateData },
      { new: true }
    );

    console.log(`已更新照片${photoId}的EXIF信息`);
    return !!result;
  } catch (error) {
    console.error('更新照片EXIF信息失败:', error);
    return false;
  }
}

/**
 * 批量处理多张照片的EXIF信息
 * @param {Array<{id: string, path: string}>} photosInfo - 照片ID和路径的数组
 * @returns {Array} - 成功和失败的结果数组
 */
async function batchProcessExif(photosInfo) {
  const results = {
    success: [],
    failed: []
  };

  for (const photo of photosInfo) {
    const success = await updatePhotoExif(photo.id, photo.path);
    if (success) {
      results.success.push(photo.id);
    } else {
      results.failed.push(photo.id);
    }
  }

  return results;
}

/**
 * 将GPS（WGS84）坐标转换为高德（GCJ-02）坐标系并获取位置名称
 * @param {number} longitude - GPS经度
 * @param {number} latitude - GPS纬度
 * @returns {Promise<{longitude: number, latitude: number, name: string|null}>} - 包含高德坐标和位置名称的对象
 */
async function convertGPSToAMap(originalLongitude, originalLatitude) {
  try {
    // 验证输入坐标的有效性
    if (typeof originalLongitude !== 'number' || typeof originalLatitude !== 'number' ||
        isNaN(originalLongitude) || isNaN(originalLatitude)) {
      throw new Error('无效的坐标值');
    }

    // 确保有API Key
    if (!config.AMAP_KEY) {
      console.warn('未配置高德地图API Key，无法进行坐标转换和逆地理编码');
      return { longitude: originalLongitude, latitude: originalLatitude, name: null };
    }

    let amapLongitude = originalLongitude;
    let amapLatitude = originalLatitude;
    let locationName = null;

    // 1. 坐标转换 (WGS84 to GCJ-02)
    const convertUrl = `https://restapi.amap.com/v3/assistant/coordinate/convert?key=${config.AMAP_KEY}&locations=${originalLongitude},${originalLatitude}&coordsys=gps`;
    try {
      const convertResponse = await axios.get(convertUrl);
      if (convertResponse.data && convertResponse.data.status === '1' && convertResponse.data.locations) {
        const [lon, lat] = convertResponse.data.locations.split(',');
        amapLongitude = parseFloat(lon);
        amapLatitude = parseFloat(lat);
      } else {
        console.error('高德地图坐标转换API返回错误:', convertResponse.data);
        // 如果转换失败，将使用原始坐标进行逆地理编码
      }
    } catch (convertError) {
      console.error('高德地图坐标转换失败:', convertError);
      // 如果转换失败，将使用原始坐标进行逆地理编码
    }
    
    // 2. 逆地理编码获取位置名称 (使用转换后的或原始的高德坐标)
    const locationStringForRegeo = `${amapLongitude},${amapLatitude}`;
    const regeoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${config.AMAP_KEY}&location=${locationStringForRegeo}&extensions=base`;
    
    try {
        const regeoResponse = await axios.get(regeoUrl);
        if (regeoResponse.data && regeoResponse.data.status === '1' && regeoResponse.data.regeocode) {
          locationName = regeoResponse.data.regeocode.formatted_address;
        } else {
          console.error('高德地图逆地理编码API返回错误:', regeoResponse.data);
        }
    } catch (regeoError) {
        console.error('高德地图逆地理编码失败:', regeoError);
    }

    // 返回转换后的高德经纬度和获取到的位置名称
    return {
      longitude: amapLongitude,
      latitude: amapLatitude,
      name: locationName
    };

  } catch (error) {
    console.error('获取位置名称或坐标转换主流程失败:', error);
    return { longitude: originalLongitude, latitude: originalLatitude, name: null }; 
  }
}

module.exports = {
  parseExifFromFile,
  updatePhotoExif,
  batchProcessExif,
  convertGPSToAMap
};
