// webpack.config.js

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  // Entry point for your application
  entry: './src/index.js',

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/',
  },

  // Mode can be 'development' or 'production'
  mode: process.env.NODE_ENV || 'development',

  // DevServer configuration for hot reloading
  devServer: {
    static: {
      directory: path.join(__dirname, 'build'),
    },
    historyApiFallback: true,
    compress: true,
    port: 3000,
    setupMiddlewares(middlewares, devServer) {
      if (!devServer) throw new Error('webpack-dev-server is not defined');
      return middlewares;
    },
  },

  // Module rules for processing different file types
  module: {
    rules: [
      // Babel loader to transpile modern JavaScript (React JSX)
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
      // CSS loader to process CSS files
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // File loader for images and fonts
      {
        test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      },
    ],
  },

  // Resolve extensions so you can import files without specifying extensions
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
  },

  // Plugins for additional functionality
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
    new CopyPlugin({
      patterns: [{ from: 'public', to: '.' }],
    }),
  ],
};