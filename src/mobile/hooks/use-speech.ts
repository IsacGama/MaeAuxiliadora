import { useCallback, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';

export type SpeechRate = 0.75 | 1.0 | 1.25;

export const speechRateLabels: Record<SpeechRate, string> = {
  0.75: 'Lento',
  1.0: 'Normal',
  1.25: 'Rápido',
};

type UseSpeechOptions = {
  onDone?: () => void;
};

export const useSpeech = (options?: UseSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState<SpeechRate>(1.0);
  const onDoneRef = useRef(options?.onDone);

  useEffect(() => {
    onDoneRef.current = options?.onDone;
  });

  const speak = useCallback(
    (text: string, language: string) => {
      Speech.stop();
      setIsSpeaking(true);
      Speech.speak(text, {
        language,
        rate,
        onDone: () => {
          setIsSpeaking(false);
          onDoneRef.current?.();
        },
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [rate],
  );

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  // Stop on unmount
  useEffect(() => () => { Speech.stop(); }, []);

  return { isSpeaking, speak, stop, rate, setRate };
};
