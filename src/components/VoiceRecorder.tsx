import { useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from '@/utils/audioRecorder';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBase64: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({ onRecordingComplete, disabled }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recorder] = useState(() => new AudioRecorder());

  const startRecording = async () => {
    try {
      await recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = async () => {
    try {
      const audioBase64 = await recorder.stop();
      setIsRecording(false);
      onRecordingComplete(audioBase64);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isRecording ? (
        <Button
          onClick={stopRecording}
          size="lg"
          variant="destructive"
          className="w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all"
        >
          <Square className="h-8 w-8" />
        </Button>
      ) : (
        <Button
          onClick={startRecording}
          disabled={disabled}
          size="lg"
          className="w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all bg-primary hover:bg-primary/90"
        >
          <Mic className="h-8 w-8" />
        </Button>
      )}
      
      {isRecording && (
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 h-8 bg-primary rounded-full animate-wave"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
      
      <p className="text-sm text-muted-foreground">
        {isRecording ? 'Recording... Click to stop' : disabled ? 'Please wait...' : 'Click to start answering'}
      </p>
    </div>
  );
};