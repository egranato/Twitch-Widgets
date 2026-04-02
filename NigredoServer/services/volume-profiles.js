/**
 * Audio Volume Profiles Service
 * Manages per-event-type volume levels and output safety caps
 */

class VolumeProfiles {
  constructor({ logger }) {
    this.logger = logger;
    this.profiles = {
      follow: { volume: 0.85, label: 'Follow Alert' },
      subscription: { volume: 0.90, label: 'Subscription Alert' },
      cheer: { volume: 0.95, label: 'Cheer Alert' },
      redemption: { volume: 0.80, label: 'Redemption Alert' },
      tts: { volume: 0.75, label: 'TTS Message' },
      test: { volume: 0.70, label: 'Audio Test' },
      default: { volume: 0.85, label: 'Default Sound' },
    };

    // Output safety cap (max volume)
    this.maxOutputVolume = 1.0;
    this.recommendedMaxVolume = 0.95; // Limiter-safe level
  }

  /**
   * Get volume for an event type
   */
  getVolume(eventType) {
    const profile = this.profiles[eventType] || this.profiles.default;
    return Math.min(profile.volume, this.recommendedMaxVolume);
  }

  /**
   * Get all profiles
   */
  getAllProfiles() {
    return { ...this.profiles };
  }

  /**
   * Update a profile volume
   */
  setVolume(eventType, newVolume) {
    if (!this.profiles[eventType]) {
      return { ok: false, error: `Unknown event type: ${eventType}` };
    }

    const clamped = Math.max(0, Math.min(1, newVolume));
    const wasCapped = clamped !== newVolume;

    this.profiles[eventType].volume = clamped;
    this.logger.info(`Volume profile updated: ${eventType} = ${clamped} ${wasCapped ? '(clamped)' : ''}`);

    return {
      ok: true,
      eventType,
      volume: clamped,
      recommended: this.recommendedMaxVolume,
    };
  }

  /**
   * Reset all profiles to defaults
   */
  resetToDefaults() {
    this.profiles = {
      follow: { volume: 0.85, label: 'Follow Alert' },
      subscription: { volume: 0.90, label: 'Subscription Alert' },
      cheer: { volume: 0.95, label: 'Cheer Alert' },
      redemption: { volume: 0.80, label: 'Redemption Alert' },
      tts: { volume: 0.75, label: 'TTS Message' },
      test: { volume: 0.70, label: 'Audio Test' },
      default: { volume: 0.85, label: 'Default Sound' },
    };
    this.logger.info('Volume profiles reset to defaults');
    return { ok: true };
  }

  /**
   * Get safety guidance text
   */
  getSafetyGuidance() {
    return {
      maxOutputVolume: this.maxOutputVolume,
      recommendedMaxVolume: this.recommendedMaxVolume,
      guidance: `Keep all volumes below ${this.recommendedMaxVolume * 100}% to avoid clipping. All audio plays through a single /audio-manager source.`,
    };
  }
}

module.exports = VolumeProfiles;
