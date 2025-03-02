const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add CSV to the list of asset extensions
config.resolver.assetExts.push("csv");

module.exports = config;
