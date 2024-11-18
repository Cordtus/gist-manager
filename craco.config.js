// craco.config.js

const path = require('path');
const { whenDev } = require('@craco/craco');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Modify the entry point if needed
      webpackConfig.entry = './src/index.js';

      // Modify the output configuration
      webpackConfig.output = {
        ...webpackConfig.output,
        path: path.resolve(__dirname, 'build'),
        filename: 'bundle.js',
        publicPath: '/',
      };

      // Add or modify module rules
      webpackConfig.module.rules.push(
        {
          test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
          use: ['file-loader'],
        }
      );

      // Modify resolve extensions
      webpackConfig.resolve.extensions = ['*', '.js', '.jsx', ...webpackConfig.resolve.extensions];

      return webpackConfig;
    },
  },
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    },
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