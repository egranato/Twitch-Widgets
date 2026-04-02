/**
 * Audio Queue Service
 * Centralized audio event queue for all alert/reward/TTS audio.
 * Supports priority, cooldown, and debouncing.
 */

class AudioQueue {
  constructor({ logger }) {
    this.logger = logger;
    this.queue = [];
    this.isPlaying = false;
    this.lastPlayedTime = {};
    this.eventId = 0;
  }

  /**
   * Add audio event to queue
   * @param {Object} event - Audio event
   * @param {string} event.type - Event type (follow, subscription, cheer, redemption, tts, misc)
   * @param {string} event.filePath - Path to audio file
   * @param {number} event.volume - Volume 0-1 (default 1)
   * @param {string} event.priority - 'high', 'normal', 'low' (default 'normal')
   * @param {number} event.cooldownMs - Minimum ms between same type (default 0)
   * @param {string} event.label - Human-readable label for logging
   * @returns {Object} - Queued event with id
   */
  enqueue(event) {
    const eventId = ++this.eventId;
    const now = Date.now();

    // Check cooldown
    const lastPlay = this.lastPlayedTime[event.type] || 0;
    const cooldown = event.cooldownMs || 0;
    const isOnCooldown = now - lastPlay < cooldown;

    // Normalize volume
    const volume = Math.max(0, Math.min(1, event.volume || 1));

    const queuedEvent = {
      id: eventId,
      type: event.type,
      filePath: event.filePath,
      volume,
      priority: event.priority || 'normal',
      cooldownMs: cooldown,
      label: event.label || event.type,
      displayEvent: event.displayEvent || null,
      addedAt: now,
      onCooldown: isOnCooldown,
    };

    if (isOnCooldown) {
      this.logger.info(
        `Audio event on cooldown (${event.type}): ${event.label} cooldown=${cooldown}ms, next available in ${cooldown - (now - lastPlay)}ms`
      );
      return { ...queuedEvent, queued: false, reason: 'cooldown' };
    }

    // Insert by priority
    const insertIndex = this._getPriorityInsertIndex(queuedEvent.priority);
    this.queue.splice(insertIndex, 0, queuedEvent);

    this.logger.info(`Audio enqueued (${queuedEvent.id}): ${queuedEvent.label} [${queuedEvent.priority}]`);
    return { ...queuedEvent, queued: true };
  }

  /**
   * Get next event from queue and mark it as playing
   */
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }
    return this.queue.shift();
  }

  /**
   * Mark event as played (updates the lastPlayedTime tracker)
   */
  markPlayed(event) {
    if (event && event.type) {
      this.lastPlayedTime[event.type] = Date.now();
      this.logger.info(`Audio played (${event.id}): ${event.label}`);
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isPlaying: this.isPlaying,
      currentQueue: this.queue.map((e) => ({
        id: e.id,
        type: e.type,
        label: e.label,
        priority: e.priority,
      })),
      lastPlayed: Object.keys(this.lastPlayedTime).map((type) => ({
        type,
        lastPlayedAt: this.lastPlayedTime[type],
      })),
    };
  }

  /**
   * Clear all events from queue
   */
  clear() {
    const count = this.queue.length;
    this.queue = [];
    this.isPlaying = false;
    this.logger.info(`Audio queue cleared (${count} events removed)`);
    return count;
  }

  /**
   * Find priority insertion point (higher priority first)
   */
  _getPriorityInsertIndex(priority) {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const priorityValue = priorityOrder[priority] || 1;

    for (let i = 0; i < this.queue.length; i++) {
      const itemPriority = priorityOrder[this.queue[i].priority] || 1;
      if (priorityValue < itemPriority) {
        return i;
      }
    }

    return this.queue.length;
  }
}

module.exports = AudioQueue;
