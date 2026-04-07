const fs = require('fs');
const path = require('path');

function resolveConfiguredPath(rawPath, serverRoot) {
  const value = String(rawPath || '').trim();
  if (!value) {
    return '';
  }

  if (path.isAbsolute(value)) {
    return value;
  }

  return path.resolve(serverRoot, value);
}

module.exports = function createAlertAudioConfig({ logger, serverRoot, followAudioFilePath, subscriptionAudioFilePath }) {
  const configuredPaths = {
    follow: resolveConfiguredPath(followAudioFilePath, serverRoot),
    subscription: resolveConfiguredPath(subscriptionAudioFilePath, serverRoot),
  };

  const getConfiguredPath = (eventType) => {
    const key = String(eventType || '').toLowerCase();
    return configuredPaths[key] || '';
  };

  const hasValidConfiguredPath = (eventType) => {
    const filePath = getConfiguredPath(eventType);
    return Boolean(filePath) && fs.existsSync(filePath);
  };

  const resolveAudioUrl = (eventType) => {
    if (hasValidConfiguredPath(eventType)) {
      return `/api/audio/custom/${String(eventType || '').toLowerCase()}`;
    }
    return '';
  };

  const getPublicStatus = () => ({
    follow: {
      configuredPath: configuredPaths.follow || '',
      exists: hasValidConfiguredPath('follow'),
    },
    subscription: {
      configuredPath: configuredPaths.subscription || '',
      exists: hasValidConfiguredPath('subscription'),
    },
  });

  const logMissingConfiguredFiles = () => {
    Object.entries(configuredPaths).forEach(([eventType, filePath]) => {
      if (filePath && !fs.existsSync(filePath)) {
        logger.warning(`Configured ${eventType} audio file not found: ${filePath}`);
      }
    });
  };

  return {
    getConfiguredPath,
    hasValidConfiguredPath,
    resolveAudioUrl,
    getPublicStatus,
    logMissingConfiguredFiles,
  };
};
