// craco.config.js

import path from 'path';

const cracoConfig = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Modify the entry point if needed
      webpackConfig.entry = './src/index.js';

      // Modify the output configuration
      webpackConfig.output = {
        ...webpackConfig.output,
        path: path.resolve(process.cwd(), 'build'),
        filename: 'bundle.js',
        publicPath: '/', // Ensure correct root path for static assets
      };

      // Add or modify module rules
      webpackConfig.module.rules.push({
        test: /\.(png|jpg|gif|svg|woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
      }
      );

      // Ensure resolve extensions are configured correctly
      webpackConfig.resolve.extensions = [
        '*', 
        '.js', 
        '.jsx', 
        ...(webpackConfig.resolve.extensions || [])
      ];

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
      logging: 'info', // Show informative logs in the browser console
      overlay: true, // Show error overlays in the browser for build issues
    },
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('Webpack Dev Server is not defined');
      }

      // You can add custom middleware here if needed
      console.log('Custom middlewares can be set up here.');

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
