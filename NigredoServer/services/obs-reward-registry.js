const fs = require('fs');
const path = require('path');

const DEFAULT_FILE_PATH = path.resolve(__dirname, '..', 'state', 'obs-reward-mappings.json');

function normalizeRewardKey(rewardTitle) {
  return String(rewardTitle || '').trim().toLowerCase();
}

function guessDriverSourceName(sourceNames) {
  const names = Array.isArray(sourceNames) ? sourceNames : [];
  if (names.length === 0) {
    return '';
  }

  const audioLike = names.find((name) => /audio|sound|sfx|voice/i.test(String(name)));
  return audioLike || names[0];
}

function normalizeSources(rawSources, fallbackSourceName) {
  const candidateSources = Array.isArray(rawSources)
    ? rawSources
    : (fallbackSourceName ? [{ sourceName: fallbackSourceName }] : []);

  const normalized = candidateSources
    .map((item) => String(item?.sourceName || '').trim())
    .filter((name) => name.length > 0);

  return normalized;
}

function ensureRegistryFile(filePath) {
  const folder = path.dirname(filePath);
  fs.mkdirSync(folder, { recursive: true });

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ mappings: [] }, null, 2), 'utf8');
  }
}

function readRegistry(filePath) {
  ensureRegistryFile(filePath);

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const mappings = Array.isArray(raw.mappings) ? raw.mappings : [];
    return { mappings };
  } catch (_) {
    return { mappings: [] };
  }
}

function writeRegistry(filePath, payload) {
  const safePayload = {
    mappings: Array.isArray(payload?.mappings) ? payload.mappings : [],
  };

  fs.writeFileSync(filePath, JSON.stringify(safePayload, null, 2), 'utf8');
}

function toPublicMapping(mapping) {
  const sources = normalizeSources(mapping.sources, mapping.sourceName);
  const driverSource = guessDriverSourceName(sources);

  return {
    rewardTitle: String(mapping.rewardTitle || '').trim(),
    sources,
    sourceName: sources[0] || '',
    driverSource,
    key: normalizeRewardKey(mapping.rewardTitle),
    updatedAt: mapping.updatedAt || null,
  };
}

module.exports = function createObsRewardRegistry(options = {}) {
  const { logger, filePath = DEFAULT_FILE_PATH } = options;

  const listMappings = () => {
    const data = readRegistry(filePath);
    return data.mappings
      .map(toPublicMapping)
      .filter((item) => item.rewardTitle && item.sourceName)
      .sort((a, b) => a.rewardTitle.localeCompare(b.rewardTitle));
  };

  const getByRewardTitle = (rewardTitle) => {
    const key = normalizeRewardKey(rewardTitle);
    if (!key) {
      return null;
    }

    const found = listMappings().find((item) => item.key === key);
    return found || null;
  };

  const upsertMapping = ({ rewardTitle, sourceName, sources }) => {
    const normalizedRewardTitle = String(rewardTitle || '').trim();
    const normalizedSources = normalizeSources(sources, sourceName);

    if (!normalizedRewardTitle) {
      throw new Error('Reward title is required');
    }

    if (normalizedSources.length === 0) {
      throw new Error('At least one OBS source mapping is required');
    }

    const key = normalizeRewardKey(normalizedRewardTitle);
    const nowIso = new Date().toISOString();

    const data = readRegistry(filePath);
    const nextMappings = data.mappings.filter((item) => normalizeRewardKey(item.rewardTitle) !== key);

    nextMappings.push({
      rewardTitle: normalizedRewardTitle,
      sources: normalizedSources,
      updatedAt: nowIso,
    });

    writeRegistry(filePath, { mappings: nextMappings });

    if (logger) {
      logger.info(
        `OBS reward mapping saved: reward='${normalizedRewardTitle}' sources=${normalizedSources.length}`,
      );
    }

    return getByRewardTitle(normalizedRewardTitle);
  };

  const removeMapping = (rewardTitle) => {
    const key = normalizeRewardKey(rewardTitle);
    if (!key) {
      return false;
    }

    const data = readRegistry(filePath);
    const previousLength = data.mappings.length;
    const nextMappings = data.mappings.filter((item) => normalizeRewardKey(item.rewardTitle) !== key);

    if (nextMappings.length === previousLength) {
      return false;
    }

    writeRegistry(filePath, { mappings: nextMappings });

    if (logger) {
      logger.info(`OBS reward mapping removed: reward='${rewardTitle}'`);
    }

    return true;
  };

  return {
    listMappings,
    getByRewardTitle,
    upsertMapping,
    removeMapping,
  };
};
