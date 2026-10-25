const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure wasm files are treated as assets, not source code
config.resolver.assetExts.push('wasm');

// Other Claude sessions keep their own copies of the project in .claude/worktrees/; don't
// bundle or watch those copies as if they were part of the game. Only the folder inside this
// copy is skipped: a session's own copy also lives in a .claude/worktrees/ folder.
const worktrees = path.join(__dirname, '.claude', 'worktrees') + path.sep;
config.resolver.blockList = [
    ...[].concat(config.resolver.blockList ?? []),
    new RegExp('^' + worktrees.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*'),
];

module.exports = config;
