/**
 * Audio Manager Route
 * Serves browser source with audio player connected via socket.io
 * OBS can add this route as a browser source with audio input
 */

const express = require('express');

const router = express.Router();

/**
 * GET /audio-manager
 * Serves HTML page with audio player and socket connection
 */
router.get('/audio-manager', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Manager</title>
  <style>
    body {
      margin: 0;
      padding: 10px;
      background: #1a1a1a;
      color: #fff;
      font-family: Arial, sans-serif;
      font-size: 12px;
    }
    #status {
      background: #2a2a2a;
      border: 1px solid #444;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .status-line {
      margin: 3px 0;
    }
    .connected {
      color: #4f8;
    }
    .disconnected {
      color: #f84;
    }
    .queue-length {
      font-weight: bold;
    }
    audio {
      display: none;
    }
  </style>
</head>
<body>
  <div id="status">
    <div class="status-line">Audio Manager</div>
    <div class="status-line connected">Socket: <span id="socket-status">connecting...</span></div>
    <div class="status-line">Queue Length: <span class="queue-length" id="queue-length">0</span></div>
    <div class="status-line">Last Event: <span id="last-event">—</span></div>
  </div>
  
  <audio id="player" crossorigin="anonymous"></audio>

  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });

    const player = document.getElementById('player');
    const statusEl = document.getElementById('socket-status');
    const queueEl = document.getElementById('queue-length');
    const lastEventEl = document.getElementById('last-event');

    let isPlaying = false;

    // Socket connection handlers
    socket.on('connect', () => {
      statusEl.textContent = 'connected';
      statusEl.className = 'connected';
      console.log('Audio Manager: Connected to server');
    });

    socket.on('disconnect', () => {
      statusEl.textContent = 'disconnected';
      statusEl.className = 'disconnected';
      console.log('Audio Manager: Disconnected from server');
    });

    // Audio queue events
    socket.on('audio-manager:queue-update', (status) => {
      queueEl.textContent = status.queueLength;
      console.log('Audio queue update:', status);
    });

    socket.on('audio-manager:play', (event) => {
      if (isPlaying) {
        console.log('Audio already playing, queuing event:', event.label);
        return;
      }

      console.log('Audio playing:', event.label, 'volume:', event.volume);
      lastEventEl.textContent = event.label;
      
      isPlaying = true;
      player.volume = event.volume || 1;
      player.src = event.filePath;
      
      // Play with error handling
      const playPromise = player.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started:', event.label);
          })
          .catch((err) => {
            console.error('Audio playback failed:', err);
            isPlaying = false;
            // Notify server that this event failed
            socket.emit('audio-manager:play-error', { eventId: event.id, error: err.message });
          });
      }
    });

    // Handle audio end
    player.addEventListener('ended', () => {
      isPlaying = false;
      console.log('Audio playback ended');
      // Request next event from queue
      socket.emit('audio-manager:ready-for-next');
    });

    player.addEventListener('error', (err) => {
      console.error('Audio player error:', err);
      isPlaying = false;
      socket.emit('audio-manager:play-error', { error: 'Audio player error' });
    });

    // Request initial status
    socket.on('connect', () => {
      socket.emit('audio-manager:request-status');
    });
  </script>
</body>
</html>
  `);
});

module.exports = router;
