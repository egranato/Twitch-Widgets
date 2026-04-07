/**
 * Audio Volume Control Route
 * Provides REST endpoints for volume profile management and audio diagnostics
 */

const express = require('express');

const router = express.Router();

/**
 * GET /api/audio/profiles
 * Get all volume profiles
 */
router.get('/audio/profiles', (req, res, next) => {
  try {
    const { volumeProfiles } = req.container;
    const profiles = volumeProfiles.getAllProfiles();
    const safety = volumeProfiles.getSafetyGuidance();

    res.json({
      ok: true,
      profiles,
      safety,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/audio/profiles/:eventType
 * Update volume for an event type
 * Body: { volume: 0.0-1.0 }
 */
router.put('/audio/profiles/:eventType', (req, res, next) => {
  try {
    const { eventType } = req.params;
    const { volume } = req.body || {};

    const { volumeProfiles, logger } = req.container;

    if (typeof volume !== 'number' || volume < 0 || volume > 1) {
      return res.status(400).json({
        ok: false,
        error: 'Volume must be a number between 0 and 1',
      });
    }

    const result = volumeProfiles.setVolume(eventType, volume);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/audio/test
 * Run audio test sequence
 */
router.post('/audio/test', (req, res, next) => {
  try {
    const { audioControlHandlers } = req.container;

    audioControlHandlers.runAudioTest().then((results) => {
      res.json({
        ok: true,
        message: 'Audio test sequence started',
        testsQueued: results.filter((r) => r.queued).length,
        results,
      });
    }).catch((error) => {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/audio/mute
 * Mute all audio (clear queue)
 */
router.post('/audio/mute', (req, res, next) => {
  try {
    const { audioControlHandlers } = req.container;
    const result = audioControlHandlers.muteAllAudio();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/alerts/test/:alertType
 * Trigger a synthetic alert event for overlay testing
 */
router.post('/alerts/test/:alertType', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    const { alertType } = req.params;
    const type = String(alertType || '').toLowerCase();
    const allowed = ['follow', 'subscription', 'cheer'];

    if (!allowed.includes(type)) {
      return res.status(400).json({
        ok: false,
        error: `Invalid alert type. Use one of: ${allowed.join(', ')}`,
      });
    }

    const { audioManagerHandlers } = req.container;
    const name = 'Desktop Test User';

    if (audioManagerHandlers) {
      if (type === 'follow') {
        audioManagerHandlers.enqueueAudio({
          type: 'follow',
          filePath: '/assets/audio/follow.mp3',
          volume: 0.85,
          priority: 'normal',
          label: 'Follow test alert',
          displayEvent: {
            name: 'follow',
            payload: name,
          },
        });
      } else if (type === 'subscription') {
        audioManagerHandlers.enqueueAudio({
          type: 'subscription',
          filePath: '/assets/audio/subscription.mp3',
          volume: 0.9,
          priority: 'high',
          label: 'Subscription test alert',
          displayEvent: {
            name: 'subscription',
            payload: `${name} just subscribed!`,
          },
        });
      } else if (type === 'cheer') {
        audioManagerHandlers.enqueueAudio({
          type: 'cheer',
          filePath: '/assets/audio/shotgun.mp3',
          volume: 0.95,
          priority: 'high',
          label: 'Cheer test alert',
        });
      }
    }

    res.json({
      ok: true,
      alertType: type,
      message: 'Test alert emitted',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/audio/diagnostics
 * Get audio queue status and diagnostics
 */
router.get('/audio/diagnostics', (req, res, next) => {
  try {
    const { audioControlHandlers } = req.container;
    const diagnostics = audioControlHandlers.getAudioDiagnostics();
    res.json({
      ok: true,
      diagnostics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/obs/status
 * Get OBS websocket connection status
 */
router.get('/obs/status', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    const status = req.container.obs.getConnectionStatus();
    res.json({ ok: true, status });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/obs/connect
 * Trigger manual OBS websocket reconnect
 */
router.post('/obs/connect', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    req.container.obs.connectManual().then((result) => {
      if (!result.ok) {
        return res.status(503).json({
          ok: false,
          error: result.status.lastError || 'Failed to connect to OBS websocket',
          status: result.status,
        });
      }

      return res.json({
        ok: true,
        message: 'Connected to OBS websocket',
        status: result.status,
      });
    }).catch((error) => {
      res.status(500).json({
        ok: false,
        error: error.message,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/obs/rewards
 * List reward title to OBS source mappings
 */
router.get('/obs/rewards', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    const mappings = req.container.obsRewardRegistry.listMappings();
    return res.json({ ok: true, mappings });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/obs/rewards/register
 * Register or update reward title to OBS source mapping
 * Body: { rewardTitle, sources: [{ sourceName, durationMs }], audio?: { fileName, volume } }
 */
router.post('/obs/rewards/register', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    const rewardTitle = String(req.body?.rewardTitle || '').trim();
    const bodySources = Array.isArray(req.body?.sources) ? req.body.sources : [];
    const sources = bodySources.map((item) => ({
      sourceName: String(item?.sourceName || '').trim(),
      durationMs:
        item?.durationMs === undefined || item?.durationMs === null || String(item?.durationMs).trim() === ''
          ? null
          : Number.parseInt(String(item.durationMs), 10),
    })).filter((item) => item.sourceName);

    // Backward compatibility for single-source payload.
    if (sources.length === 0) {
      const sourceName = String(req.body?.sourceName || '').trim();
      const durationMs =
        req.body?.durationMs === undefined || req.body?.durationMs === null || String(req.body?.durationMs).trim() === ''
          ? null
          : Number.parseInt(String(req.body.durationMs), 10);
      if (sourceName) {
        sources.push({ sourceName, durationMs });
      }
    }

    const audioFileName = String(req.body?.audio?.fileName || '').trim();
    const audioVolume = Number.parseFloat(String(req.body?.audio?.volume || '0.9'));

    if (!rewardTitle) {
      return res.status(400).json({ ok: false, error: 'Reward title is required' });
    }

    if (sources.length === 0) {
      return res.status(400).json({ ok: false, error: 'At least one OBS source mapping is required' });
    }

    const invalidSource = sources.find(
      (item) => item.durationMs !== null && (!Number.isInteger(item.durationMs) || item.durationMs <= 0),
    );
    if (invalidSource) {
      return res.status(400).json({ ok: false, error: 'Each source duration must be a positive integer (ms) when provided' });
    }

    const audio = audioFileName
      ? {
          fileName: audioFileName,
          volume: Number.isFinite(audioVolume) ? audioVolume : 0.9,
        }
      : null;

    const mapping = req.container.obsRewardRegistry.upsertMapping({
      rewardTitle,
      sources,
      audio,
    });

    return res.json({ ok: true, mapping });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/obs/rewards/remove
 * Remove reward title to OBS source mapping
 * Body: { rewardTitle }
 */
router.post('/obs/rewards/remove', (req, res, next) => {
  try {
    if (!req.container) {
      return res.status(503).json({
        ok: false,
        error: 'Server is still initializing',
      });
    }

    const rewardTitle = String(req.body?.rewardTitle || '').trim();
    if (!rewardTitle) {
      return res.status(400).json({ ok: false, error: 'Reward title is required' });
    }

    const removed = req.container.obsRewardRegistry.removeMapping(rewardTitle);
    return res.json({ ok: true, removed });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

module.exports = router;
