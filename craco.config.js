// craco.config.js - simplified version
module.exports = {
  // Just add the proxy configuration for API requests
  devServer: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
};