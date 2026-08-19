module.exports = {
  apps: [
    {
      name: 'angryui',
      script: 'dist-server/index.js',
      instances: 1,
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 5000,
      max_memory_restart: '300M',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      out_file: 'logs/angryui.out.log',
      error_file: 'logs/angryui.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        AGY_WEBUI_PORT: 5173,
        AGY_WEBUI_HOST: '0.0.0.0'
      }
    }
  ]
};
