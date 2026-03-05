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

type SpeakOptions = {
  audioUri?: string | null;
};

export const useSpeech = (options?: UseSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState<SpeechRate>(1.0);
  const onDoneRef = useRef(options?.onDone);
  const soundRef = useRef<any | null>(null);
  const audioModuleRef = useRef<any | null>(null);
  const playTokenRef = useRef(0);

  useEffect(() => {
    onDoneRef.current = options?.onDone;
  });

  const ensureAudioModule = () => {
    if (audioModuleRef.current !== null) {
      return audioModuleRef.current;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const module = require('expo-av');
      audioModuleRef.current = module?.Audio ?? false;
      return audioModuleRef.current;
    } catch {
      audioModuleRef.current = false;
      return null;
    }
  };

  const cleanupSound = useCallback(async () => {
    const currentSound = soundRef.current;
    soundRef.current = null;
    if (!currentSound) {
      return;
    }
    try {
      await currentSound.unloadAsync?.();
    } catch {
      // ignora falha de cleanup
    }
  }, []);

  const speak = useCallback(
    async (text: string, language: string, payload?: SpeakOptions) => {
      const playToken = playTokenRef.current + 1;
      playTokenRef.current = playToken;
      let finished = false;

      const finish = (shouldNotifyDone: boolean) => {
        if (finished || playTokenRef.current !== playToken) {
          return;
        }
        finished = true;
        setIsSpeaking(false);
        if (shouldNotifyDone) {
          onDoneRef.current?.();
        }
      };

      await cleanupSound();
      Speech.stop();
      setIsSpeaking(true);
      const audioUri = payload?.audioUri?.trim();
      const Audio = audioUri ? ensureAudioModule() : null;

      if (audioUri && Audio?.Sound) {
        try {
          if (typeof Audio.setAudioModeAsync === 'function') {
            await Audio.setAudioModeAsync({
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
              shouldDuckAndroid: true,
            });
          }

          const sound = new Audio.Sound();
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (playTokenRef.current !== playToken) {
              return;
            }

            if (status?.didJustFinish) {
              finish(true);
              void cleanupSound();
              return;
            }

            if (status?.isLoaded === false || status?.error) {
              finish(true);
              void cleanupSound();
              return;
            }
          });

          await sound.loadAsync(
            { uri: audioUri },
            {
              shouldPlay: true,
              progressUpdateIntervalMillis: 250,
            },
          );
          return;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'erro desconhecido';
          console.warn(
            `[speech] falha ao tocar MP3 (${audioUri}): ${message}`,
          );
          await cleanupSound();
          finish(true);
          return;
        }
      }

      Speech.speak(text, {
        language,
        rate,
        onDone: () => {
          finish(true);
        },
        onStopped: () => {
          finish(false);
        },
        onError: () => {
          finish(true);
        },
      });
    },
    [cleanupSound, rate],
  );

  const stop = useCallback(() => {
    playTokenRef.current += 1;
    Speech.stop();
    void cleanupSound();
    setIsSpeaking(false);
  }, [cleanupSound]);

  // Stop on unmount
  useEffect(
    () => () => {
      Speech.stop();
      void cleanupSound();
    },
    [cleanupSound],
  );

  return { isSpeaking, speak, stop, rate, setRate };
};
