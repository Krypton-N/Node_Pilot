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
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
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
    // Overlay solo para errores de compilación. Los errores de runtime
    // cross-origin (Monaco/CDN) llegan como "Script error." sin traza útil y
    // taparían toda la UI; los dejamos en la consola, no en pantalla completa.
    client: {
      overlay: { errors: true, warnings: false, runtimeErrors: false },
    },
    // El front consume el backend Express sin lidiar con CORS:
    // todo lo que vaya a /healthz o /api se reenvía al puerto 8080.
    proxy: [
      {
        context: ['/healthz', '/api', '/preview'],
        target: 'http://localhost:8080',
      },
      {
        // Logs de procesos en vivo (WebSocket) hacia el backend.
        // Ruta '/np-ws' propia para no chocar con el HMR de webpack ('/ws').
        context: ['/np-ws'],
        target: 'http://localhost:8080',
        ws: true,
      },
    ],
  },
};
