import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client/build/esm/socket';
import {
  AlertEvent,
  MessageEvent,
  RedemptionEvent,
} from '../models/events.models';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  private messageEventSubject: Subject<MessageEvent>;
  public messageEvent: Observable<MessageEvent>;

  private ttsMessageEventSubject: Subject<string>;
  public ttsMessageEvent: Observable<string>;

  private alertEventSubject: Subject<AlertEvent>;
  public alertEvent: Observable<AlertEvent>;

  private redemptionEventSubject: Subject<RedemptionEvent>;
  public redemptionEvent: Observable<RedemptionEvent>;

  constructor() {
    this.messageEventSubject = new Subject<MessageEvent>();
    this.messageEvent = this.messageEventSubject.asObservable();

    this.ttsMessageEventSubject = new Subject<string>();
    this.ttsMessageEvent = this.ttsMessageEventSubject.asObservable();

    this.alertEventSubject = new Subject<AlertEvent>();
    this.alertEvent = this.alertEventSubject.asObservable();

    this.redemptionEventSubject = new Subject<RedemptionEvent>();
    this.redemptionEvent = this.redemptionEventSubject.asObservable();

    this.socket = io('ws://localhost:3000');

    this.socket.on('message', (event: MessageEvent) => {
      this.messageEventSubject.next(event);
    });

    this.socket.on('follow', (event: string) => {
      this.alertEventSubject.next({ displayName: event, type: 'follow' });
    });

    this.socket.on('point-redeem', (event: RedemptionEvent) => {
      this.redemptionEventSubject.next(event);
    });

    this.socket.on('tts-message', (event: string) => {
      this.ttsMessageEventSubject.next(event);
    });
  }

  fulfillPointReward(id: string, rewardId: string): void {
    this.socket.emit('point-fulfill', { id, rewardId });
  }

  completeTTS(id: string): void {
    this.socket.emit('tts-complete', id);
  }
}
