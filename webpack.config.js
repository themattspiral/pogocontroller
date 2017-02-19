const webpack = require('webpack'),
      HtmlWebpackPlugin = require('html-webpack-plugin');

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
    extensions: ['.js'],
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
        exclude: /node_modules/,
        enforce: 'pre',
        loader: 'eslint-loader',
      },

      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },

      {
        test: /\.scss/,
        // include: [__dirname + '/client/app.scss'],
        loader: [
          'style-loader?sourceMap',
          'css-loader?sourceMap',
          'sass-loader?sourceMap'
        ]
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
