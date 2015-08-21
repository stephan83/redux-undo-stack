/*eslint-disable */

var path = require('path');

var reduxSmartActionExternal = {
  root: 'ReduxSmartAction',
  commonjs2: 'redux-smart-action',
  commonjs: 'redux-smart-action',
  amd: 'redux-smart-action'
};

module.exports = {
  externals: {
    'redux-smart-action': reduxSmartActionExternal
  },
  module: {
    loaders: [
      {
        test: /\.js?$/,
        loader: 'babel?stage=0',
        include: path.join(__dirname, 'src')
      }
    ],
  },
  output: {
    library: 'ReactUndoStack',
    libraryTarget: 'umd'
  },
  resolve: {
    extensions: ['', '.js']
  }
};
