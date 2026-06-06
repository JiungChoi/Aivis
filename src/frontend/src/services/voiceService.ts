const BASE = 'http://localhost:5050/api/voice';

export const voiceService = {
  async transcribe(audioBlob: Blob): Promise<string> {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.wav');
    const res = await fetch(`${BASE}/transcribe`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('STT 실패');
    const json = await res.json();
    return (json.data as string) ?? '';
  },

  async synthesize(text: string, voice?: string): Promise<ArrayBuffer> {
    const res = await fetch(`${BASE}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    if (!res.ok) throw new Error('TTS 실패');
    return res.arrayBuffer();
  },

  async playText(text: string): Promise<void> {
    return new Promise((resolve) => {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'ko-KR';
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();

      const doSpeak = () => {
        const voices = synth.getVoices();
        const ko = voices.find((v) => v.lang.startsWith('ko'));
        if (ko) utter.voice = ko;
        synth.speak(utter);
        // Chrome 버그: speak() 후 paused 상태로 빠지는 경우가 있음
        setTimeout(() => { if (synth.paused) synth.resume(); }, 150);
      };

      if (synth.getVoices().length > 0) {
        doSpeak();
      } else {
        synth.addEventListener('voiceschanged', doSpeak, { once: true });
      }
    });
  },
};
