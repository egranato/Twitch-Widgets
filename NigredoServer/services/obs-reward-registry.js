const fs = require('fs');
const path = require('path');

const DEFAULT_FILE_PATH = path.resolve(__dirname, '..', 'state', 'obs-reward-mappings.json');

function normalizeRewardKey(rewardTitle) {
  return String(rewardTitle || '').trim().toLowerCase();
}

function sanitizeDurationMs(value, fallback = 4500) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sanitizeOptionalDurationMs(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function sanitizeVolume(value, fallback = 0.9) {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) {
    return 0;
  }

  if (parsed > 1) {
    return 1;
  }

  return parsed;
}

function normalizeSources(rawSources, fallbackSourceName, fallbackDurationMs) {
  const candidateSources = Array.isArray(rawSources)
    ? rawSources
    : (fallbackSourceName ? [{ sourceName: fallbackSourceName, durationMs: fallbackDurationMs }] : []);

  const normalized = candidateSources
    .map((item) => ({
      sourceName: String(item?.sourceName || '').trim(),
      durationMs: sanitizeOptionalDurationMs(item?.durationMs),
    }))
    .filter((item) => item.sourceName);

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
  const sources = normalizeSources(mapping.sources, mapping.sourceName, mapping.durationMs);

  let audio = null;
  if (mapping.audio && typeof mapping.audio === 'object') {
    const fileName = String(mapping.audio.fileName || '').trim();
    if (fileName) {
      audio = {
        fileName,
        volume: sanitizeVolume(mapping.audio.volume, 0.9),
      };
    }
  }

  return {
    rewardTitle: String(mapping.rewardTitle || '').trim(),
    sources,
    sourceName: sources[0]?.sourceName || '',
    durationMs: sources[0]?.durationMs ?? null,
    audio,
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

  const upsertMapping = ({ rewardTitle, sourceName, durationMs, sources, audio }) => {
    const normalizedRewardTitle = String(rewardTitle || '').trim();
    const normalizedSources = normalizeSources(sources, sourceName, durationMs);

    let normalizedAudio = null;
    if (audio && typeof audio === 'object') {
      const fileName = String(audio.fileName || '').trim();
      if (fileName) {
        normalizedAudio = {
          fileName,
          volume: sanitizeVolume(audio.volume, 0.9),
        };
      }
    }

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
      audio: normalizedAudio,
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
