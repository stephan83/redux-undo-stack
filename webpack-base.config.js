/*eslint-disable */

var path = require('path');

module.exports = {

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
