import { Component } from '@angular/core';
import { SocketService } from 'src/app/services/socket.service';
import { MessageEvent } from '../../models/events.models';

class ChatModifiers {
  invert: boolean;
  scramble: boolean;
  spin: boolean;
  static modifiers = ['invert', 'spin', 'scramble'];

  constructor() {
    this.invert = false;
    this.scramble = false;
    this.spin = false;
  }

  classes() {
    return {
      invert: this.invert,
      spin: this.spin,
    };
  }

  toggleModifier(mod: string) {
    switch (mod) {
      case 'invert':
        this.invert = true;
        setTimeout(() => {
          this.invert = false;
        }, 5000);
        break;

      case 'spin':
        this.spin = true;
        setTimeout(() => {
          this.spin = false;
        }, 5000);
        break;

      case 'scramble':
        this.scramble = true;
        setTimeout(() => {
          this.scramble = false;
        }, 5000);
        break;
    }
  }
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent {
  chatHistory: Array<MessageEvent>;
  chatModifiers: ChatModifiers;

  constructor(private socketService: SocketService) {
    this.chatModifiers = new ChatModifiers();

    this.chatHistory = [];

    this.socketService.messageEvent.subscribe((event: MessageEvent) => {
      this.chatHistory.push(event);

      this.checkForModifiers(event.message);

      if (this.chatHistory.length > 20) {
        this.chatHistory.splice(0, 1);
      }
    });
  }

  checkForModifiers(text: string) {
    ChatModifiers.modifiers.forEach((mod) => {
      if (text.toLowerCase().includes(`!${mod}`)) {
        this.chatModifiers.toggleModifier(mod);
      }
    });
  }

  shuffleText(text: string) {
    const array = text.split(' ');
    let currentIndex = array.length,
      randomIndex;

    while (currentIndex != 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }

    return array.join(' ');
  }
}
