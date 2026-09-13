module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // @react-navigation and the nitro-based native packages ship untranspiled
  // ESM, which Jest skips inside node_modules by default.
  transformIgnorePatterns: [
    'node_modules/(?!(?:@react-native|react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-nitro-modules|react-native-nitro-image|react-native-vision-camera|react-native-vision-camera-face-detector|react-native-fast-tflite|react-native-nitro-sound)/)',
  ],
  moduleNameMapper: {
    // Metro treats these as assets (see metro.config.js); Jest must not parse them.
    '\\.(wav|tflite)$': '<rootDir>/__mocks__/binaryAssetMock.js',
  },
};
