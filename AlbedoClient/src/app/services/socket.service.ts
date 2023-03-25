import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client/build/esm/socket';
import { AlertEvent, MessageEvent } from '../models/events.models';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  private messageEventSubject: Subject<MessageEvent>;
  public messageEvent: Observable<MessageEvent>;

  private alertEventSubject: Subject<AlertEvent>;
  public alertEvent: Observable<AlertEvent>;

  constructor() {
    this.messageEventSubject = new Subject<MessageEvent>();
    this.messageEvent = this.messageEventSubject.asObservable();

    this.alertEventSubject = new Subject<AlertEvent>();
    this.alertEvent = this.alertEventSubject.asObservable();

    this.socket = io('ws://localhost:3000');

    this.socket.on('message', (event: MessageEvent) => {
      this.messageEventSubject.next(event);
    });

    this.socket.on('follow', (event: string) => {
      this.alertEventSubject.next({ displayName: event, type: 'follow' });
    });
  }

  onOAuth(token: string): void {
    this.socket.emit('OAuth', token);
  }
}
