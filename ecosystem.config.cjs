module.exports = {
  apps: [
    {
      name: 'payvia360-gateway',
      script: 'backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        FRONTEND_URL: 'https://payvia360.com',
        API_BASE_URL: 'https://payvia360.com'
      }
    }
  ]
};
