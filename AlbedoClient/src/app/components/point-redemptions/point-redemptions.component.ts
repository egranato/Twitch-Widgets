import { Component } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { SocketService } from 'src/app/services/socket.service';
import { RedemptionAlert } from './redemption-alert.model';
import { REWARDS } from './rewards.data';

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
      const title = event.reward.title;
      const reward = REWARDS.find((r) => r.title === title);

      if (reward === void 0) {
        console.log(`Unhandled reward redeemed: ${event.reward.title}`);
      } else {
        this.addAlertToQueue({
          id: event.id,
          rewardId: event.reward.id,
          type: reward.type,
          name: reward.filename,
        });
      }
    });
  }

  addAlertToQueue(alert: RedemptionAlert): void {
    this.alertQueueStore.next([...this.alertQueueStore.value, alert]);
  }

  removeAlertFromQueue(event: { id: string; rewardId: string }): void {
    const queue = this.alertQueueStore.value;
    if (queue.length === 0) {
      return;
    }

    const removeIndex = queue.findIndex(
      (item) => item.id === event.id && item.rewardId === event.rewardId
    );

    if (removeIndex >= 0) {
      this.alertQueueStore.next([
        ...queue.slice(0, removeIndex),
        ...queue.slice(removeIndex + 1),
      ]);
    } else {
      this.alertQueueStore.next(queue.slice(1));
    }

    this.socketService.fulfillPointReward(event.id, event.rewardId);
  }
}
