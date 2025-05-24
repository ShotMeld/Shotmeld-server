module.exports = {
  apps: [{
    name: "shotmeld-server",
    script: "src/index.js",
    watch: false,
    max_memory_restart: "512M",
    kill_timeout: 3000,
    wait_ready: false,
    listen_timeout: 50000,
    instances: "max",
    exec_mode: "cluster",
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000,
    error_file: "logs/error.log",
    out_file: "logs/out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss",
    merge_logs: true,
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3000
    }
  }]
}
