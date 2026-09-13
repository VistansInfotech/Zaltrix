/* Native module stubs so component tests can render without a device. */

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  const stub = (name) => {
    const C = (props) => React.createElement(View, { ...props, testID: name });
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg: stub('Svg'),
    Path: stub('Path'),
    Circle: stub('Circle'),
    Line: stub('Line'),
    Rect: stub('Rect'),
    G: stub('G'),
  };
});

jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-biometrics', () => ({
  __esModule: true,
  default: class {
    isSensorAvailable() {
      return Promise.resolve({ available: true, biometryType: 'FaceID' });
    }
    simplePrompt() {
      return Promise.resolve({ success: true });
    }
  },
  BiometryTypes: { FaceID: 'FaceID', TouchID: 'TouchID', Biometrics: 'Biometrics' },
}));

jest.mock('react-native-permissions', () => ({
  checkNotifications: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestNotifications: jest.fn().mockResolvedValue({ status: 'granted' }),
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
}));

jest.mock('react-native-localize', () => ({
  findBestLanguageTag: () => ({ languageTag: 'en', isRTL: false }),
}));

jest.mock('react-native-device-info', () => ({
  getVersion: () => '1.0.0',
  getBuildNumber: () => '1',
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: (k) => Promise.resolve(store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, v); return Promise.resolve(); },
      removeItem: (k) => { store.delete(k); return Promise.resolve(); },
      removeMany: (ks) => { ks.forEach((k) => store.delete(k)); return Promise.resolve(); },
      getMany: (ks) => Promise.resolve(Object.fromEntries(ks.map((k) => [k, store.get(k) ?? null]))),
      setMany: (e) => { Object.entries(e).forEach(([k, v]) => store.set(k, v)); return Promise.resolve(); },
      getAllKeys: () => Promise.resolve([...store.keys()]),
      clear: () => { store.clear(); return Promise.resolve(); },
    },
  };
});
