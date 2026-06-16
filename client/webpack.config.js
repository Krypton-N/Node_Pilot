const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
  devServer: {
    port: 3000,
    open: true,
    hot: true,
    historyApiFallback: true,
    // El front consume el backend Express sin lidiar con CORS:
    // todo lo que vaya a /healthz o /api se reenvía al puerto 3001.
    proxy: [
      {
        context: ['/healthz', '/api'],
        target: 'http://localhost:3001',
      },
      {
        // Logs de procesos en vivo (WebSocket) hacia el backend.
        // Ruta '/np-ws' propia para no chocar con el HMR de webpack ('/ws').
        context: ['/np-ws'],
        target: 'http://localhost:3001',
        ws: true,
      },
    ],
  },
};
