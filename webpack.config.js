const path = require('path');
const { DefinePlugin } = require('webpack');

const agentationVersion = require('./node_modules/agentation/package.json').version;

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
  plugins: [
    new DefinePlugin({
      __AGENTATION_VERSION__: JSON.stringify(agentationVersion),
    }),
  ],
  // Bundle everything — no host page dependencies
  externals: {},
  // Chrome extensions load locally — web asset size limits don't apply
  performance: false,
};
