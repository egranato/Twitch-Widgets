import { Component } from '@angular/core';
import { AlertEvent } from 'src/app/models/events.models';
import { SocketService } from 'src/app/services/socket.service';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
})
export class AlertsComponent {
  constructor(private socketService: SocketService) {
    this.socketService.alertEvent.subscribe(this.fireAlert);
  }

  fireAlert(event: AlertEvent): void {
    console.log(event);
  }
}
