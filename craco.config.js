// craco.config.js
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Entry point configuration
      webpackConfig.entry = './src/index.js';

      // Output configuration
      webpackConfig.output = {
        ...webpackConfig.output,
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
        publicPath: '/',
      };

      // Add module rules
      webpackConfig.module.rules.push(
        {
          test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
          use: ['file-loader'],
        }
      );

      // Fix resolve extensions to include the leading dot
      webpackConfig.resolve.extensions = ['.js', '.jsx', '.json', '.web.jsx', '.web.js', '.mjs', '.web.mjs', ...webpackConfig.resolve.extensions];

      return webpackConfig;
    },
  },
  
  // Dev server configuration
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    },
    // Add proxy configuration for API requests
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  
  plugins: [
    {
      plugin: {
        overrideDevServerConfig: ({ devServerConfig }) => {
          return {
            ...devServerConfig,
            historyApiFallback: true,
            compress: true,
            port: 3000,
            static: {
              directory: path.join(__dirname, 'build'),
            },
          };
        },
      },
    },
  ],
};