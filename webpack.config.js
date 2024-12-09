const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/', // Ensure it loads assets from the root
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader', // Transpile JSX/JavaScript
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'], // Tailwind and CSS support
      },
      {
        test: /\.(png|jpg|gif|svg|ico|webp)$/,
        type: 'asset/resource', // Handle image files
        generator: {
          filename: 'assets/[name][hash][ext]', // Output images in 'assets/' with hash
        },
      },
      {
        test: /\.json$/,
        type: 'asset/resource', // Ensures JSON files are served as static assets
        include: path.resolve(__dirname, 'public'), // Ensure it includes the public directory
        generator: {
          filename: '[name][ext]', // Keeps the original name, e.g., manifest.json
        },
      },      
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html', // Path to your HTML template
      filename: 'index.html', // Output HTML file
      inject: true, // Automatically injects scripts and styles
      favicon: './public/favicon.ico', // Adds favicon to the output HTML
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx'], // Resolve both JavaScript and JSX files
  },
  devServer: {
    historyApiFallback: true, // Enables React Router to handle routing
    static: {
      directory: path.join(__dirname, 'public'), // Serve static files
    },
    compress: true, // Gzip compression
    port: 3000, // Development server port
    hot: true, // Enable Hot Module Replacement (HMR)
    setupMiddlewares: (middlewares, devServer) => {
      // Your middleware logic here (if needed)
      console.log('Setting up middlewares...');
      return middlewares;
    },
  },
};
