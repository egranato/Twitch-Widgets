import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RedemptionAlert } from '../redemption-alert.model';

const DEFAULT_REDEMPTION_DISPLAY_MS = 4500;

@Component({
  selector: 'app-reward-media',
  templateUrl: './reward-media.component.html',
  styleUrls: ['./reward-media.component.scss'],
})
export class RewardMediaComponent implements OnInit {
  @Input() alert: RedemptionAlert | null = null;
  @Output() completed: EventEmitter<{ id: string; rewardId: string }> =
    new EventEmitter<{ id: string; rewardId: string }>();

  mediaUrl?: string;
  private displayTimeoutId: number | null = null;

  constructor() {}

  ngOnInit(): void {
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
        break;
    }
  }

  complete(): void {
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

  scheduleComplete(): void {
    if (this.displayTimeoutId !== null) {
      window.clearTimeout(this.displayTimeoutId);
    }

    this.displayTimeoutId = window.setTimeout(() => {
      this.complete();
    }, DEFAULT_REDEMPTION_DISPLAY_MS);
  }
}
