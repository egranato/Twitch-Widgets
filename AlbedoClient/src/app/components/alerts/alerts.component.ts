import { Component } from '@angular/core';
import { AlertEvent } from 'src/app/models/events.models';
import { AudioService } from 'src/app/services/audio.service';
import { SocketService } from 'src/app/services/socket.service';

interface Alert {
  text: string;
  message: string;
}

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
})
export class AlertsComponent {
  public alert: Alert | null = null;

  constructor(
    private socketService: SocketService,
    private audioService: AudioService
  ) {
    this.socketService.alertEvent.subscribe((event) => {
      this.fireAlert(event);
    });
  }

  fireAlert(event: AlertEvent): void {
    switch (event.type) {
      case 'follow':
        this.alert = {
          text: `${event.displayName} has just followed!`,
          message: 'Thank you so much!',
        };
        break;
      case 'subscription':
        this.alert = {
          text: event.displayName,
          message: "You're a real homie <3",
        };
        break;
    }

    this.playAlertSound(event.type);
    setTimeout(() => {
      this.alert = null;
    }, 10000);
  }

  playAlertSound(type: string): void {
    this.audioService.playAudio(type);
  }
}
