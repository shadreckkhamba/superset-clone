# Configuration Directory

This directory contains environment-specific configuration files.

## Setup

1. Copy `env.config.example.js` to `env.config.js`:
   ```bash
   cp env.config.example.js env.config.js
   ```

2. Copy `endpoints.example.js` to `endpoints.js`:
   ```bash
   cp endpoints.example.js endpoints.js
   ```

3. Update both `env.config.js` and `endpoints.js` with your actual IP addresses and ports

4. **IMPORTANT**: Never commit `env.config.js` or `endpoints.js` to version control as they contain sensitive information

## Environment Variables

You can also use environment variables instead of hardcoding values:

- `BACKEND_HOST` - Backend API server hostname/IP
- `BACKEND_PORT` - Backend API server port
- `DEV_SERVER_HOST` - Webpack dev server hostname/IP
- `DEV_SERVER_PORT` - Webpack dev server port
- `SUPERSET_APP_HOST` - Superset app hostname
- `SUPERSET_APP_PORT` - Superset app port

## Usage

The config is imported in `webpack.config.js` and used throughout the application:

```javascript
const envConfig = require('./src/config/env.config');

// Use the config values
const backendUrl = envConfig.getBackendUrl();
```
