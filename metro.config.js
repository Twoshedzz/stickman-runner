const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure wasm files are treated as assets, not source code
config.resolver.assetExts.push('wasm');

module.exports = config;
