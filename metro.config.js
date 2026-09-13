const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // The face-embedding model and the attendance chimes are require()'d like
    // images, so Metro copies them into the bundle instead of parsing as source.
    assetExts: [...defaultConfig.resolver.assetExts, 'tflite', 'wav'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
