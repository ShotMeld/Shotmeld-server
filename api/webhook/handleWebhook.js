const { exec } = require('child_process');
const crypto = require('crypto');
const config = require('../../config/config');

/**
 * 处理来自Git仓库的webhook请求
 * @param {object} req - Express请求对象
 * @param {object} res - Express响应对象
 */
function handleWebhook(req, res) {
  try {
    // 验证请求
    const signature = req.headers['x-hub-signature-256'];
    const githubSecret = config.GITHUB_WEBHOOK_SECRET;
    
    // 如果配置了密钥，则验证签名
    if (githubSecret) {
      if (!signature) {
        return res.status(401).json({ message: '缺少签名' });
      }

      const hmac = crypto.createHmac('sha256', githubSecret);
      const calculatedSignature = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
      
      // 验证签名是否匹配
      if (signature !== calculatedSignature) {
        return res.status(401).json({ message: '签名验证失败' });
      }
    }

    // 立即返回响应，不等待部署完成
    res.status(200).json({ message: '正在处理部署' });

    // 执行Git拉取和应用重启
    console.log('接收到webhook请求，开始更新代码...');
    
    const deploymentProcess = exec('git pull && npm install', { 
      cwd: '/opt/myapi' // 确保在正确的目录中执行
    });

    deploymentProcess.stdout.on('data', (data) => {
      console.log(`部署输出: ${data}`);
    });

    deploymentProcess.stderr.on('data', (data) => {
      console.error(`部署错误: ${data}`);
    });

    deploymentProcess.on('close', (code) => {
      if (code === 0) {
        console.log('代码更新成功，正在重启应用...');
        // 使用PM2重启应用
        exec('pm2 restart myapi', (error) => {
          if (error) {
            console.error(`重启应用失败: ${error}`);
            return;
          }
          console.log('应用重启成功');
        });
      } else {
        console.error(`代码更新失败，退出码: ${code}`);
      }
    });
    
  } catch (error) {
    console.error('Webhook处理错误:', error);
    res.status(500).json({ message: '服务器内部错误' });
  }
}

module.exports = handleWebhook;
