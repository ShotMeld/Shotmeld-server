module.exports = {
  apps: [{
    name: "myapi",
    script: "index.js",
    watch: true,
    ignore_watch: ["node_modules", "uploads", ".git"],
    watch_options: {
      "followSymlinks": false,
      "usePolling": true,
      "interval": 1000
    },
    env: {
      NODE_ENV: "development",
    },
    env_production: {
      NODE_ENV: "production",
    }
  }]
}
