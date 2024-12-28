// craco.config.js

import path from 'path';

const cracoConfig = {
  webpack: {
    configure: (webpackConfig) => {
      // Ensure the entry point is correctly set
      webpackConfig.entry = './src/index.js';

      // Modify output configuration
      webpackConfig.output = {
        ...webpackConfig.output,
        path: path.resolve(process.cwd(), 'build'),
        filename: 'bundle.js',
        publicPath: '/', // Correct path for static assets
      };

      // Add custom module rules for assets
      webpackConfig.module.rules.push({
        test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      });

      // Ensure resolve extensions are appropriately configured
      webpackConfig.resolve.extensions = [
        ...new Set([
          '.js',
          '.jsx',
          '.json',
          ...(webpackConfig.resolve.extensions || []),
        ]),
      ];

      // Return the updated Webpack config
      return webpackConfig;
    },
  },
  devServer: {
    static: {
      directory: path.join(process.cwd(), 'public'), // Serve files from /public during development
    },
    historyApiFallback: true, // Handle SPA routing
    compress: true,
    port: 3000,
    client: {
      logging: 'info', // Informative logs in the browser console
      overlay: { errors: true, warnings: false }, // Show error overlays in the browser
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('Webpack Dev Server is not defined');
      }
      console.log('Setting up middlewares...');
      return middlewares;
    },
  },
  plugins: [
    {
      plugin: {
        overrideDevServerConfig: ({ devServerConfig }) => ({
          ...devServerConfig,
          historyApiFallback: true,
          compress: true,
          port: 3000,
          static: {
            directory: path.join(process.cwd(), 'build'),
          },
        }),
      },
    },
  ],
};

export default cracoConfig;
