const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona suporte para arquivos de assets do @react-navigation
config.resolver.assetExts.push('png');
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json', 'cjs'];

// Adiciona os módulos do react-navigation na lista de resolução
config.resolver.extraNodeModules = {
  '@react-navigation': `${__dirname}/node_modules/@react-navigation`,
};

module.exports = config;
