import { TextToSpeech } from '@capacitor-community/text-to-speech';

export async function nativeSpeak(text: string, rate = 0.9): Promise<void> {
  await TextToSpeech.speak({
    text,
    lang: 'en-US',
    rate,
    pitch: 1.0,
    volume: 1.0,
    category: 'ambient',
  });
}

export async function nativeStop(): Promise<void> {
  await TextToSpeech.stop();
}
