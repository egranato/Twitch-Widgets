import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RedemptionAlert } from '../redemption-alert.model';
import { AudioService } from 'src/app/services/audio.service';

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

  constructor(private audioService: AudioService) {}

  ngOnInit(): void {
    switch (this.alert?.type) {
      case 'hybrid':
        this.mediaUrl = this.createImageUrl(this.alert.name);
        this.runAudio(this.alert.name);
        break;
      case 'audio':
        this.runAudio(this.alert.name);
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

  runAudio(name: string): void {
    this.audioService.playAudio(name).then((_) => {
      this.complete();
    });
  }
}
