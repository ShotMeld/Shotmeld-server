# 阿里云OSS配置指南

本项目使用阿里云对象存储服务(OSS)来存储上传的照片和缩略图。

## 环境变量配置

在启动应用前，需要配置以下环境变量：

```shell
# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_REGION=oss-cn-hangzhou  # 你使用的OSS区域
OSS_BUCKET=your_bucket_name  # 你的Bucket名称
# 自定义域名配置（可选）
OSS_CUSTOM_DOMAIN=https://cdn.your-domain.com
```

## OSS访问权限配置

1. 登录阿里云控制台，进入OSS服务。
2. 创建一个新的Bucket，或使用现有Bucket。
3. 配置Bucket访问权限：
   - 如果你使用自定义域名，建议将读写权限设置为「公共读」
   - 如果通过签名URL访问，可以设置为「私有」

## CORS配置

如果你的前端应用需要直接上传到OSS，需要配置跨域资源共享(CORS)：

1. 在Bucket管理页面，选择「权限管理」>「跨域设置」。
2. 添加CORS规则：
   - 来源：填写你的应用域名，例如 `http://localhost:8080`
   - 允许Methods：GET, POST, PUT, DELETE
   - 允许Headers：*, Content-Type, Content-Disposition
   - 暴露Headers：ETag

## CDN加速（推荐）

为了提高图片加载速度，建议配置CDN加速：

1. 在阿里云CDN服务中添加加速域名，源站选择你的OSS Bucket。
2. 配置HTTPS证书（推荐）。
3. 将CDN加速域名配置到`OSS_CUSTOM_DOMAIN`环境变量中。

## 注意事项

1. 确保你的阿里云账号有足够的OSS访问权限。
2. AccessKey和SecretKey应该保密，不要提交到代码仓库。
3. 生产环境建议使用RAM账号创建的AccessKey，并只赋予必要的权限。
