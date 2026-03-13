const path = require('path');

module.exports = {
  entry: {
    content: './content/index.tsx',
    popup: './popup/popup.ts',
    background: './background/service-worker.ts',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  // Bundle everything — no host page dependencies
  externals: {},
};
