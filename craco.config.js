const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
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
      webpackConfig.module.rules.push({
        test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource', // Replacing deprecated `file-loader`
      });

      // Modify resolve extensions
      webpackConfig.resolve.extensions = ['.js', '.jsx', ...webpackConfig.resolve.extensions];

      return webpackConfig;
    },
  },
  devServer: {
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }

      devServer.historyApiFallback = true;
      devServer.compress = true;
      devServer.port = 3000;
      devServer.static = {
        directory: path.join(__dirname, 'build'),
      };

      return middlewares;
    },
  },
  style: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
};
