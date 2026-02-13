/* eslint-disable @typescript-eslint/no-require-imports */
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace packages and root node_modules for pnpm symlink resolution
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages/data'),
  path.resolve(monorepoRoot, 'packages/database'),
  path.resolve(monorepoRoot, 'packages/ui-native'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Let Metro know where to resolve packages from monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Apply NativeWind CSS processing first
const nativeWindConfig = withNativeWind(config, { input: './global.css' });

// Then add polyfills on top (SharedArrayBuffer for Hermes)
const nwGetPolyfills = nativeWindConfig.serializer?.getPolyfills || ((ctx) => []);
nativeWindConfig.serializer = {
  ...nativeWindConfig.serializer,
  getPolyfills: (ctx) => {
    return [
      path.resolve(projectRoot, 'polyfills.js'),
      ...nwGetPolyfills(ctx),
    ];
  },
};

module.exports = nativeWindConfig;
