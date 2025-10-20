module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      'react-native-reanimated/plugin', // Required for Expo Router
      ...(isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : []),
    ],
  };
};