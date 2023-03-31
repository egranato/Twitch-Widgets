import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AudioService {
  constructor() {}

  playAudio(fileName: string): Promise<void> {
    // wont work in chrome or safari but will work in OBS
    return new Promise((resolve, reject) => {
      const audio = new Audio(`/assets/audio/${fileName}.mp3`);
      audio.onended = (event) => {
        resolve();
      };
      audio.play();
    });
  }
}
