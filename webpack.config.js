const webpack           = require('webpack');

module.exports = {
    entry: {
        'app': './client/app.js'
    },

    output: {
        path: __dirname + '/public',
        publicPath: '/',
        filename: '[name].js',
        chunkFilename: '[id].[hash].chunk.js'
    },

    resolve: {
        extensions: [ '.js' ],
        modules: [
            __dirname + '/client',
            'node_modules'
        ]
    }
};
