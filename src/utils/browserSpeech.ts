// Browser-based speech recognition and synthesis (no API keys needed)

export class BrowserSpeechRecognition {
  private recognition: any;
  private isListening = false;

  constructor(
    private onResult: (transcript: string) => void,
    private onError: (error: string) => void
  ) {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      this.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  start() {
    if (!this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  stop() {
    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isActive() {
    return this.isListening;
  }
}

export class BrowserSpeechSynthesis {
  private synth: SpeechSynthesis;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synth = window.speechSynthesis;
  }

  speak(text: string, onEnd?: () => void): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synth.cancel();

      this.currentUtterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings for better clarity
      this.currentUtterance.rate = 0.9; // Slightly slower for clarity
      this.currentUtterance.pitch = 1.0;
      this.currentUtterance.volume = 1.0;

      // Try to use the highest quality voice available
      const voices = this.synth.getVoices();
      
      // Priority order: Google US English > Microsoft > Enhanced > Premium > Any English
      const preferredVoice = 
        voices.find(voice => voice.name.includes('Google US English')) ||
        voices.find(voice => voice.name.includes('Microsoft') && voice.lang === 'en-US') ||
        voices.find(voice => voice.name.includes('Enhanced')) ||
        voices.find(voice => voice.name.includes('Premium')) ||
        voices.find(voice => voice.name.includes('Natural')) ||
        voices.find(voice => voice.lang === 'en-US') ||
        voices.find(voice => voice.lang.startsWith('en'));

      if (preferredVoice) {
        this.currentUtterance.voice = preferredVoice;
        console.log('Using voice:', preferredVoice.name);
      }

      this.currentUtterance.onend = () => {
        if (onEnd) onEnd();
        resolve();
      };

      this.currentUtterance.onerror = (error) => {
        console.error('Speech synthesis error:', error);
        reject(error);
      };

      this.synth.speak(this.currentUtterance);
    });
  }

  stop() {
    this.synth.cancel();
  }

  isSpeaking() {
    return this.synth.speaking;
  }
}
