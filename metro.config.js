const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Stub Node-built-ins that Supabase pulls in but aren't needed on web/RN
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // opentelemetry is loaded by @supabase/supabase-js but unused at runtime
  '@opentelemetry/api': require.resolve('./src/stubs/opentelemetry-api.js'),
};

module.exports = config;
