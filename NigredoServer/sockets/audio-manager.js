/**
 * Audio Manager Socket Handlers
 * Manages socket.io events for the audio queue system
 */

module.exports = function setupAudioManagerHandlers(container) {
  const { io, audioQueue, logger } = container;

  // Queue event emitter that sends updates to all connected audio managers
  const emitQueueStatus = () => {
    io.emit('audio-manager:queue-update', audioQueue.getStatus());
  };

  // Handle audio manager client connections
  io.on('connection', (socket) => {
    // Handle audio manager client requests
    socket.on('audio-manager:request-status', () => {
      socket.emit('audio-manager:queue-update', audioQueue.getStatus());
    });

    socket.on('audio-manager:ready-for-next', () => {
      audioQueue.isPlaying = false;
      processNextAudioEvent();
    });

    socket.on('audio-manager:play-error', (data) => {
      logger.warning(`Audio manager playback error (event ${data.eventId}):`, data.error);
      audioQueue.isPlaying = false;
      // Try next event in queue
      processNextAudioEvent();
    });
  });

  /**
   * Process next audio event in queue and send to audio managers
   */
  const processNextAudioEvent = () => {
    if (audioQueue.isPlaying) {
      return;
    }

    const event = audioQueue.dequeue();
    if (event) {
      audioQueue.isPlaying = true;
      audioQueue.markPlayed(event);

      if (event.displayEvent && event.displayEvent.name) {
        io.emit(event.displayEvent.name, event.displayEvent.payload);
      }

      io.emit('audio-manager:play', event);
      emitQueueStatus();
    }
  };

  return {
    enqueueAudio: (event) => {
      const result = audioQueue.enqueue(event);
      if (result.queued) {
        emitQueueStatus();
        // If nothing is playing, start processing
        if (!audioQueue.isPlaying && audioQueue.queue.length > 0) {
          processNextAudioEvent();
        }
      }
      return result;
    },
    getAudioStatus: () => audioQueue.getStatus(),
    clearAudioQueue: () => {
      const cleared = audioQueue.clear();
      emitQueueStatus();
      return cleared;
    },
  };
};
