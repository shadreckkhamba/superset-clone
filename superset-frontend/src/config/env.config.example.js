/**
 * Environment Configuration Example
 * 
 * Copy this file to env.config.js and update with your actual values.
 * 
 * For production, use environment variables:
 * - BACKEND_HOST
 * - BACKEND_PORT
 * - DEV_SERVER_HOST
 * - DEV_SERVER_PORT
 * - SUPERSET_APP_HOST
 * - SUPERSET_APP_PORT
 */

const config = {
  // Backend API server
  BACKEND_HOST: process.env.BACKEND_HOST || 'localhost',
  BACKEND_PORT: process.env.BACKEND_PORT || '5001',
  
  // Webpack dev server
  DEV_SERVER_HOST: process.env.DEV_SERVER_HOST || 'localhost',
  DEV_SERVER_PORT: process.env.DEV_SERVER_PORT || 5000,
  
  // Superset app
  SUPERSET_APP_HOST: process.env.SUPERSET_APP_HOST || 'superset_app',
  SUPERSET_APP_PORT: process.env.SUPERSET_APP_PORT || '8088',
};

// Helper to get full backend URL
config.getBackendUrl = () => `http://${config.BACKEND_HOST}:${config.BACKEND_PORT}`;

// Helper to get full dev server URL
config.getDevServerUrl = () => `http://${config.DEV_SERVER_HOST}:${config.DEV_SERVER_PORT}`;

module.exports = config;
