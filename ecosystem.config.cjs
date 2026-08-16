module.exports = {
  apps: [
    {
      name: 'angryui',
      script: 'dist-server/server/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        AGY_WEBUI_PORT: 3000,
        AGY_WEBUI_HOST: '0.0.0.0'
      }
    }
  ]
};
