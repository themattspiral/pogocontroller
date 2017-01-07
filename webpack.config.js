const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
      'app': './client/app.js'
  },

  output: {
      path: __dirname + '/public',
      publicPath: '/',
      filename: '[name].[hash].js',
      chunkFilename: '[id].[hash].chunk.js'
  },

  resolve: {
      extensions: [ '.js' ],
      modules: [
          __dirname + '/client',
          'node_modules'
      ]
  },

  performance: {
    hints: false
  },

  module: {

    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        exclude: /node_modules/
      }
    ]

  },

  plugins: [

    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'client/index.html'
    }),

  ]
};
