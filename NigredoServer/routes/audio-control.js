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
