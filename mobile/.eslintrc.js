module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Enforce no hardcoded hex color literals in UI code
    'no-restricted-syntax': [
      'warn',
      {
        selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
        message: "Do not use hardcoded hex colors. Import tokens from '@/theme' instead.",
      },
    ],
  },
  overrides: [
    {
      // src/theme/ is the authorized single source of truth for color definitions
      files: ['src/theme/**/*.ts'],
      rules: {
        'no-restricted-syntax': 'off',
      },
    },
  ],
};
