module.exports = {
  apps: [{
    name: "shotmeld-server",
    script: "index.js",
    watch: false,
    max_memory_restart: "512M",
    kill_timeout: 3000,
    wait_ready: false,
    listen_timeout: 50000,
    env: {
      NODE_ENV: "production"
    }
  }]
}
