import { Component } from '@angular/core';
import { SocketService } from 'src/app/services/socket.service';
import { MessageEvent } from '../../models/events.models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent {
  chatHistory: Array<MessageEvent>;

  constructor(private socketService: SocketService) {
    this.chatHistory = [];

    this.socketService.messageEvent.subscribe((event: MessageEvent) => {
      this.chatHistory.push(event);

      if (this.chatHistory.length > 100) {
        this.chatHistory.shift();
      }
    });
  }
}
