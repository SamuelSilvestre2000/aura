const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite carrega um binário .wasm no navegador (backend wa-sqlite/OPFS).
config.resolver.assetExts.push('wasm');

module.exports = config;
