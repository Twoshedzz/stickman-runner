const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure wasm files are treated as assets, not source code
config.resolver.assetExts.push('wasm');

// Other Claude sessions keep their own copies of the project in .claude/worktrees/; don't
// bundle or watch those copies as if they were part of the game.
config.resolver.blockList = [
    ...[].concat(config.resolver.blockList ?? []),
    /[\\/]\.claude[\\/]worktrees[\\/].*/,
];

module.exports = config;
