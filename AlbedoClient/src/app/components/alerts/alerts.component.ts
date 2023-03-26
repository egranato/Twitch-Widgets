import { Component } from '@angular/core';
import { AlertEvent } from 'src/app/models/events.models';
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

  constructor(private socketService: SocketService) {
    this.socketService.alertEvent.subscribe((event) => {
      this.fireAlert(event);
    });
  }

  fireAlert(event: AlertEvent): void {
    const text = `${event.displayName} has just ${this.getAlertText(
      event.type
    )}`;
    const message = this.getAlertMessage(event);
    this.alert = { text, message };
    setTimeout(() => {
      this.alert = null;
    }, 10000);
  }

  getAlertText(type: string): string {
    switch (type) {
      case 'follow':
        return 'followed!';
      default:
        return '';
    }
  }

  getAlertMessage(event: AlertEvent): string {
    switch (event.type) {
      default:
        return 'Thank you so much!';
    }
  }
}
