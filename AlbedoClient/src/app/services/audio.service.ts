import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  private queue: Array<{
    fileName: string;
    resolve: (event: Event) => void;
    reject: (error: unknown) => void;
  }> = [];

  private isProcessing = false;

  constructor() {}

  playAudio(fileName: string): Promise<Event> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fileName, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) {
        continue;
      }

      try {
        const event = await this.playSingleAudio(next.fileName);
        next.resolve(event);
      } catch (error) {
        next.reject(error);
      }
    }

    this.isProcessing = false;
  }

  private playSingleAudio(fileName: string): Promise<Event> {
    // This does not autoplay in all browsers, but works as expected in OBS browser sources.
    return new Promise((resolve, reject) => {
      const audio = new Audio(`/assets/audio/${fileName}.mp3`);

      audio.onended = (event) => {
        resolve(event);
      };

      audio.onerror = (event) => {
        reject(event);
      };

      audio.play().catch((error) => {
        reject(error);
      });
    });
  }
}
