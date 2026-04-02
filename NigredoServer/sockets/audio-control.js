/**
 * Audio Control Socket Handlers
 * Manages audio test sequences, mute/unmute, and volume diagnostics
 */

module.exports = function setupAudioControlHandlers(container) {
  const { io, audioQueue, volumeProfiles, logger, sleep } = container;

  // Track recent audio events for diagnostics
  const recentAudioEvents = [];
  const maxEventHistory = 50;

  /**
   * Log an audio event for diagnostics
   */
  const logAudioEvent = (type, event, status = 'success') => {
    recentAudioEvents.unshift({
      timestamp: new Date().toISOString(),
      type,
      event: event?.label || event?.type || 'unknown',
      status,
      volume: event?.volume,
    });

    // Keep only recent events
    if (recentAudioEvents.length > maxEventHistory) {
      recentAudioEvents.pop();
    }

    // Broadcast to connected clients
    io.emit('audio:event-logged', {
      timestamp: recentAudioEvents[0].timestamp,
      type,
      event: recentAudioEvents[0].event,
      status,
    });
  };

  /**
   * Run audio health test sequence
   */
  const runAudioTest = async (options = {}) => {
    const { delayBetweenMs = 2000 } = options;
    const testEvents = [
      { type: 'follow', sound: '/assets/audio/follow.mp3' },
      { type: 'subscription', sound: '/assets/audio/subscription.mp3' },
      { type: 'cheer', sound: '/assets/audio/shotgun.mp3' },
    ];

    logger.info('[audio-test] Starting audio health test sequence');
    const results = [];

    for (const test of testEvents) {
      try {
        const volume = volumeProfiles.getVolume(test.type);
        const result = audioQueue.enqueue({
          type: test.type,
          filePath: test.sound,
          volume,
          priority: 'high',
          label: `Audio Test (${test.type})`,
        });

        logAudioEvent('test', result, result.queued ? 'queued' : 'skipped');
        results.push(result);

        // Wait before next test
        if (delayBetweenMs > 0) {
          await sleep(delayBetweenMs);
        }
      } catch (error) {
        logger.error(`[audio-test] Error testing ${test.type}:`, error);
        logAudioEvent('test', test, 'error');
        results.push({ ok: false, error: error.message, type: test.type });
      }
    }

    logger.info(`[audio-test] Sequence complete: ${results.length} tests queued`);
    return results;
  };

  /**
   * Mute all audio (clear queue)
   */
  const muteAllAudio = () => {
    const clearedCount = audioQueue.clear();
    logger.info(`[audio-mute] Muted all audio (${clearedCount} events cleared)`);
    logAudioEvent('control', { label: 'Mute All', type: 'mute' }, 'success');
    io.emit('audio:muted-all', { timestamp: new Date().toISOString(), eventsCleared: clearedCount });
    return { ok: true, eventsCleared: clearedCount };
  };

  /**
   * Get audio diagnostics
   */
  const getAudioDiagnostics = () => {
    const queueStatus = audioQueue.getStatus();
    const profiles = volumeProfiles.getAllProfiles();
    const safety = volumeProfiles.getSafetyGuidance();

    return {
      queueStatus,
      volumeProfiles: profiles,
      safetyGuidance: safety,
      recentEvents: recentAudioEvents.slice(0, 20), // Last 20 events
      eventHistorySize: recentAudioEvents.length,
    };
  };

  // Socket handlers
  io.on('connection', (socket) => {
    socket.on('audio-control:request-diagnostics', () => {
      const diagnostics = getAudioDiagnostics();
      socket.emit('audio-diagnostics', diagnostics);
    });

    socket.on('audio-control:run-test', async (options, callback) => {
      try {
        const results = await runAudioTest(options);
        if (callback) {
          callback({ ok: true, results });
        }
      } catch (error) {
        logger.error('[audio-control] Test error:', error);
        if (callback) {
          callback({ ok: false, error: error.message });
        }
      }
    });

    socket.on('audio-control:mute-all', (callback) => {
      const result = muteAllAudio();
      if (callback) {
        callback(result);
      }
    });
  });

  return {
    runAudioTest,
    muteAllAudio,
    getAudioDiagnostics,
    logAudioEvent,
  };
};
