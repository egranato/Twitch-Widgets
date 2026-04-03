class RewardDisplayQueue {
  constructor({ io, logger, timeoutMs = 8000 }) {
    this.io = io;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.queue = [];
    this.active = null;
    this.activeTimeoutHandle = null;
    this.enqueueAudioFn = null;
  }

  setAudioEnqueue(fn) {
    if (typeof fn === 'function') {
      this.enqueueAudioFn = fn;
    }
  }

  enqueue(event, options = {}) {
    if (!event || !event.id) {
      return { queued: false, reason: 'invalid-event' };
    }

    const eventId = String(event.id);

    if (this.active && String(this.active.event.id) === eventId) {
      return { queued: false, reason: 'already-active' };
    }

    const existsInQueue = this.queue.some((queued) => String(queued.event.id) === eventId);
    if (existsInQueue) {
      return { queued: false, reason: 'already-queued' };
    }

    const queueItem = {
      event,
      audio: options.audio || null,
    };

    this.queue.push(queueItem);
    this.logger.info(
      `[reward-display] queued ${event.reward?.title || 'unknown'} (${event.id}); queue=${this.queue.length}`
    );

    this.processNext();
    return { queued: true };
  }

  complete(eventId) {
    if (!eventId) {
      return { completed: false, reason: 'missing-id' };
    }

    const targetId = String(eventId);

    if (this.active && String(this.active.id) === targetId) {
      this.logger.info(
        `[reward-display] completed ${this.active.event.reward?.title || 'unknown'} (${this.active.event.id})`
      );
      this.clearActive();
      this.processNext();
      return { completed: true, source: 'active' };
    }

    const index = this.queue.findIndex((item) => String(item.event.id) === targetId);
    if (index >= 0) {
      const [removed] = this.queue.splice(index, 1);
      this.logger.info(
        `[reward-display] removed queued ${removed.event.reward?.title || 'unknown'} (${removed.event.id}); queue=${this.queue.length}`
      );
      return { completed: true, source: 'queued' };
    }

    return { completed: false, reason: 'not-found' };
  }

  processNext() {
    if (this.active || this.queue.length === 0) {
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      return;
    }

    this.active = next;
    this.io.emit('point-redeem', next.event);
    this.logger.info(
      `[reward-display] showing ${next.event.reward?.title || 'unknown'} (${next.event.id}); remaining=${this.queue.length}`
    );

    if (next.audio && this.enqueueAudioFn) {
      this.enqueueAudioFn(next.audio);
    }

    this.activeTimeoutHandle = setTimeout(() => {
      if (!this.active || String(this.active.event.id) !== String(next.event.id)) {
        return;
      }

      this.logger.warning(
        `[reward-display] timeout auto-advance for ${next.event.reward?.title || 'unknown'} (${next.event.id})`
      );
      this.clearActive();
      this.processNext();
    }, this.timeoutMs);
  }

  clearActive() {
    if (this.activeTimeoutHandle) {
      clearTimeout(this.activeTimeoutHandle);
      this.activeTimeoutHandle = null;
    }
    this.active = null;
  }
}

module.exports = RewardDisplayQueue;