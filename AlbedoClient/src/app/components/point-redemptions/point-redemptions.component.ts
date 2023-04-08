import { Component } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { SocketService } from 'src/app/services/socket.service';
import { RedemptionAlert } from './redemption-alert.model';

@Component({
  selector: 'app-point-redemptions',
  templateUrl: './point-redemptions.component.html',
  styleUrls: ['./point-redemptions.component.scss'],
})
export class PointRedemptionsComponent {
  alertQueueStore: BehaviorSubject<Array<RedemptionAlert>> =
    new BehaviorSubject<Array<RedemptionAlert>>([]);

  alert = this.alertQueueStore.asObservable().pipe(
    map((value) => {
      if (value.length > 0) {
        return value[0];
      } else {
        return null;
      }
    })
  );

  constructor(private socketService: SocketService) {
    this.socketService.redemptionEvent.subscribe((event) => {
      switch (event.reward.title) {
        case 'Shotgun':
          this.addAlertToQueue({
            id: event.reward.id,
            rewardId: event.id,
            type: 'hybrid',
            name: 'shotgun',
          });
          break;
        case 'Bleh':
          this.addAlertToQueue({
            id: event.reward.id,
            rewardId: event.id,
            type: 'hybrid',
            name: 'bleh',
          });
          break;
        case 'Loser':
          this.addAlertToQueue({
            id: event.reward.id,
            rewardId: event.id,
            type: 'video',
            name: 'loser',
          });
          break;
        case 'Yupee':
          this.addAlertToQueue({
            id: event.reward.id,
            rewardId: event.id,
            type: 'video',
            name: 'yupee',
          });
          break;
        default:
          console.log(`Unhandled reward redeemed: ${event.reward.title}`);
      }
    });
  }

  addAlertToQueue(alert: RedemptionAlert): void {
    const queue = this.alertQueueStore.value;
    queue.push(alert);
    this.alertQueueStore.next(queue);
  }

  removeAlertFromQueue(event: { id: string; rewardId: string }): void {
    const queue = this.alertQueueStore.value;
    queue.shift();
    this.alertQueueStore.next(queue);
    this.socketService.fulfillPointReward(event.id, event.rewardId);
  }
}
