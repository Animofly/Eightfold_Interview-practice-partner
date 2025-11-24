export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private onEndedCallback: (() => void) | null = null;

  async play(base64Audio: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stop();

        // Create audio element
        this.audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
        
        this.audio.onended = () => {
          console.log('Audio playback finished');
          if (this.onEndedCallback) {
            this.onEndedCallback();
          }
          resolve();
        };

        this.audio.onerror = (error) => {
          console.error('Audio playback error:', error);
          reject(error);
        };

        this.audio.play().catch(reject);
        console.log('Audio playback started');
      } catch (error) {
        console.error('Error creating audio:', error);
        reject(error);
      }
    });
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
  }

  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }
}