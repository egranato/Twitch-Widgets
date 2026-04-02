import { Component } from '@angular/core';
import { AlertEvent } from 'src/app/models/events.models';
import { SocketService } from 'src/app/services/socket.service';

interface Alert {
  text: string;
  message: string;
}

const ALERT_DURATION_MS = 10000;

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
})
export class AlertsComponent {
  public alert: Alert | null = null;
  private queue: Alert[] = [];
  private isShowingAlert = false;

  constructor(private socketService: SocketService) {
    this.socketService.alertEvent.subscribe((event) => {
      this.enqueueAlert(event);
    });
  }

  enqueueAlert(event: AlertEvent): void {
    const alert = this.createAlert(event);
    if (!alert) {
      return;
    }

    this.queue.push(alert);
    this.showNextAlert();
  }

  createAlert(event: AlertEvent): Alert | null {
    switch (event.type) {
      case 'follow':
        return {
          text: `${event.displayName} has just followed!`,
          message: 'Thank you so much!',
        };
      case 'subscription':
        return {
          text: event.displayName,
          message: "You're a real legend <3",
        };
      default:
        return null;
    }
  }

  showNextAlert(): void {
    if (this.isShowingAlert || this.queue.length === 0) {
      return;
    }

    this.isShowingAlert = true;
    this.alert = this.queue.shift() || null;

    setTimeout(() => {
      this.alert = null;
      this.isShowingAlert = false;
      this.showNextAlert();
    }, ALERT_DURATION_MS);
  }
}
