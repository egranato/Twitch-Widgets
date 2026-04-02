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

    const { io, audioManagerHandlers } = req.container;
    const name = 'Desktop Test User';

    if (type === 'follow') {
      io.emit('follow', name);
    } else {
      io.emit('subscription', `${name} just subscribed!`);
    }

    if (audioManagerHandlers) {
      if (type === 'follow') {
        audioManagerHandlers.enqueueAudio({
          type: 'follow',
          filePath: '/assets/audio/follow.mp3',
          volume: 0.85,
          priority: 'normal',
          label: 'Follow test alert',
        });
      } else if (type === 'subscription') {
        audioManagerHandlers.enqueueAudio({
          type: 'subscription',
          filePath: '/assets/audio/subscription.mp3',
          volume: 0.9,
          priority: 'high',
          label: 'Subscription test alert',
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

module.exports = router;
