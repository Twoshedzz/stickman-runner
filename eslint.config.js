// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.claude/*'],
  },
  {
    // Since SDK 56 the lint includes the React Compiler's own checks. They flag the game's
    // deliberate design: the per-frame game state lives in a ref that changes without React
    // knowing (docs/ARCHITECTURE.md, "Rules that keep it safe"). The compiler leaves those
    // parts alone rather than break them, so these stay as warnings: visible, not failures.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/error-boundaries': 'warn',
    },
  },
  {
    // The scripts run in Node.
    files: ['scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
]);
