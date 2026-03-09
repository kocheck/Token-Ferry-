/**
 * webpack.skpm.config.js
 *
 * Customizes the webpack config used by @skpm/builder.
 * Adds TypeScript support via ts-loader.
 */
module.exports = function (config) {
  // Add .ts resolution
  config.resolve = config.resolve || {};
  config.resolve.extensions = ['.ts', '.js', '.json'];

  // Add ts-loader for .ts files
  config.module = config.module || {};
  config.module.rules = config.module.rules || [];
  config.module.rules.push({
    test: /\.ts$/,
    exclude: /node_modules/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
      },
    },
  });
};
