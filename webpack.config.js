/*eslint-disable */

var webpack = require('webpack');
var baseConfig = require('./webpack-base.config.js');

var definePlugin = new webpack.DefinePlugin({
  __DEV__: JSON.stringify(JSON.parse('true')),
  __PROD__: JSON.stringify(JSON.parse('false'))
});

baseConfig.cache = true;
baseConfig.plugins = [definePlugin];

module.exports = baseConfig;
