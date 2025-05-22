// craco.config.js
const cracoConfig = {
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    },
    port: 3020,
    host: 'localhost'
  },
  webpack: {
    configure: (webpackConfig) => {
      // Handle ESM imports in development
      webpackConfig.resolve.extensionAlias = {
        '.js': ['.js', '.ts', '.tsx']
      };
      return webpackConfig;
    }
  }
};

export default cracoConfig;