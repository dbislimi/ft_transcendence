import { useEffect, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

type SoundType = 'lifeLoss' | 'success' | 'error' | 'bonus' | 'turnTransition';

const generateTone = (audioContext: AudioContext, frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' = 'sine'): AudioBuffer => {
  const sampleRate = audioContext.sampleRate;
  const numSamples = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let value = 0;
    
    if (type === 'sine') {
      value = Math.sin(2 * Math.PI * frequency * t);
    } else if (type === 'square') {
      value = Math.sign(Math.sin(2 * Math.PI * frequency * t));
    } else if (type === 'sawtooth') {
      value = 2 * ((t * frequency) % 1) - 1;
    } 
    const envelope = t < 0.01 ? t / 0.01 : (duration - t < 0.01 ? (duration - t) / 0.01 : 1);
    data[i] = value * envelope * 0.3;
  }
  return buffer;
};

const createSound = (audioContext: AudioContext, type: SoundType): AudioBuffer | null => {
  try {
    switch (type) {
      case 'lifeLoss':
        return generateTone(audioContext, 150, 0.3, 'square');
      case 'success':
        return generateTone(audioContext, 523, 0.2, 'sine');
      case 'error':
        return generateTone(audioContext, 200, 0.3, 'square');
      case 'bonus':
        return generateTone(audioContext, 659, 0.3, 'sine');
      case 'turnTransition':
        return generateTone(audioContext, 440, 0.15, 'sine');
      default:
        return null;
    }
  } catch (e) {
    console.warn('Impossible de créer le son:', e);
    return null;
  }
};

export function useSoundEffects() {
  const { settings } = useSettings();
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundBuffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());

  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (audioContextRef.current) {
        const soundTypes: SoundType[] = ['lifeLoss', 'success', 'error', 'bonus', 'turnTransition'];
        soundTypes.forEach((type) => {
          const buffer = createSound(audioContextRef.current!, type);
          if (buffer) {
            soundBuffersRef.current.set(type, buffer);
          }
        });
      }
    } catch (e) {
      console.warn('AudioContext non disponible:', e);
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (type: SoundType) => {
    const soundsEnabled = settings.game?.preferences?.soundsEnabled ?? true;
    const reducedMotion = settings.game?.preferences?.reducedMotion ?? false;
    if (!soundsEnabled || reducedMotion)
      return;
    try {
      const audioContext = audioContextRef.current;
      if (!audioContext) 
        return;
      const buffer = soundBuffersRef.current.get(type);
      if (!buffer) 
        return;
      if (audioContext.state === 'suspended')
        audioContext.resume();
      
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = buffer;
      gainNode.gain.value = 0.3;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      source.start(0);
    } catch (e) {
      console.warn('Impossible de jouer le son:', e);
    }
  };
  return { playSound };
}
