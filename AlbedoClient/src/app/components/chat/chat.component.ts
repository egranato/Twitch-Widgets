import { Component, ViewEncapsulation } from '@angular/core';
import { AudioService } from 'src/app/services/audio.service';
import { SocketService } from 'src/app/services/socket.service';
import { MessageEvent } from '../../models/events.models';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ChatComponent {
  chatHistory: Array<MessageEvent>;

  constructor(
    private socketService: SocketService,
    private audioService: AudioService
  ) {
    this.chatHistory = [];

    this.socketService.messageEvent.subscribe((event: MessageEvent) => {
      this.chatHistory.push(event);

      setTimeout(() => {
        this.chatHistory.shift();
      }, 20000);
    });

    this.socketService.ttsMessageEvent.subscribe((id: string) => {
      this.audioService.playAudio(id).then((_) => {
        this.socketService.completeTTS(id);
      });
    });
  }
}
