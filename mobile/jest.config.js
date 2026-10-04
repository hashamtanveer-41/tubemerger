module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/mocks/'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__tests__/mocks/styleMock.js',
    '^lucide-react-native$': '<rootDir>/__tests__/mocks/lucideMock.js',
    '^@aptabase/react-native$': '<rootDir>/__tests__/mocks/aptabaseMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|nativewind|react-native-css-interop|@react-navigation|lucide-react-native)',
  ],
};
