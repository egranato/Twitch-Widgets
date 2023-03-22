import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io } from 'socket.io-client';
import { Socket } from 'socket.io-client/build/esm/socket';
import { MessageEvent } from '../models/events.models';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  private socket: Socket;

  private messageEventSubject: Subject<MessageEvent>;
  public messageEvent: Observable<MessageEvent>;

  constructor() {
    this.messageEventSubject = new Subject<MessageEvent>();
    this.messageEvent = this.messageEventSubject.asObservable();

    this.socket = io('ws://localhost:3000');

    this.socket.on('message', (message: MessageEvent) => {
      console.log(message);
      this.messageEventSubject.next(message);
    });
  }

  finishAuth(authMap: any) {
    if (this.socket.connected) {
      this.socket.emit('finishAuth', authMap);
    } else {
      setTimeout(() => {
        this.finishAuth(authMap);
      }, 500);
    }
  }
}
