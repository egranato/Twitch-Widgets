import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { RedemptionAlert } from '../redemption-alert.model';

const DEFAULT_REDEMPTION_DISPLAY_MS = 4500;
const VIDEO_FALLBACK_COMPLETE_MS = 4500;

@Component({
  selector: 'app-reward-media',
  templateUrl: './reward-media.component.html',
  styleUrls: ['./reward-media.component.scss'],
})
export class RewardMediaComponent implements OnChanges, OnDestroy {
  @Input() alert: RedemptionAlert | null = null;
  @Output() completed: EventEmitter<{ id: string; rewardId: string }> =
    new EventEmitter<{ id: string; rewardId: string }>();

  mediaUrl?: string;
  private displayTimeoutId: number | null = null;
  private activeAlertToken = 0;
  private completedForToken = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['alert']) {
      this.prepareMediaForAlert();
    }
  }

  ngOnDestroy(): void {
    this.clearDisplayTimeout();
  }

  prepareMediaForAlert(): void {
    this.clearDisplayTimeout();
    this.mediaUrl = undefined;
    this.activeAlertToken += 1;
    this.completedForToken = false;

    switch (this.alert?.type) {
      case 'hybrid':
        this.mediaUrl = this.createImageUrl(this.alert.name);
        this.scheduleComplete();
        break;
      case 'audio':
        this.scheduleComplete();
        break;
      case 'video':
        this.mediaUrl = this.createVideoUrl(this.alert.name);
        this.scheduleComplete(VIDEO_FALLBACK_COMPLETE_MS);
        break;
    }
  }

  onVideoError(): void {
    // Prevent queue lock if media file fails to load in browser source.
    this.complete();
  }

  complete(): void {
    if (this.completedForToken) {
      return;
    }

    this.completedForToken = true;
    this.clearDisplayTimeout();

    const id = this.alert?.id || '';
    const rewardId = this.alert?.rewardId || '';
    this.completed.emit({ id, rewardId });
  }

  createVideoUrl(name: string): string {
    return `/assets/video/${name}.mp4`;
  }

  createImageUrl(name: string): string {
    return `/assets/images/${name}.gif`;
  }

  scheduleComplete(delayMs: number = DEFAULT_REDEMPTION_DISPLAY_MS): void {
    this.clearDisplayTimeout();
    const token = this.activeAlertToken;

    this.displayTimeoutId = window.setTimeout(() => {
      if (token !== this.activeAlertToken) {
        return;
      }
      this.complete();
    }, delayMs);
  }

  clearDisplayTimeout(): void {
    if (this.displayTimeoutId !== null) {
      window.clearTimeout(this.displayTimeoutId);
      this.displayTimeoutId = null;
    }
  }
}
