import { useState, useRef, useCallback, useEffect } from 'react';
import { voiceService } from '../services/voiceService';

// Web Speech API minimal type shims
interface SpeechRecognitionResult { readonly [index: number]: { transcript: string }; readonly isFinal: boolean; }
interface SpeechRecognitionResultList { readonly length: number; readonly [index: number]: SpeechRecognitionResult; }
interface ISpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
interface ISpeechRecognition extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  start(): void; stop(): void;
}
type SpeechRecognitionCtor = new () => ISpeechRecognition;

interface UseVoiceInputOptions {
  onTranscribed: (text: string) => void;
  onAutoSend: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export function useVoiceInput({ onTranscribed, onAutoSend, inputRef }: UseVoiceInputOptions) {
  const [recording, setRecording] = useState(false);
  const [interimText, setInterimText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shouldStopRef = useRef(false);
  const autoSendRef = useRef(false);

  const onTranscribedRef = useRef(onTranscribed);
  const onAutoSendRef = useRef(onAutoSend);
  useEffect(() => { onTranscribedRef.current = onTranscribed; }, [onTranscribed]);
  useEffect(() => { onAutoSendRef.current = onAutoSend; }, [onAutoSend]);

  const start = useCallback(async (autoSend = false) => {
    if (mediaRecorderRef.current) return;

    shouldStopRef.current = false;
    autoSendRef.current = autoSend;
    chunksRef.current = [];

    // ── 1. SpeechRecognition: 실시간 텍스트 표시용 ──────────────
    const SpeechRecCtor: SpeechRecognitionCtor | undefined =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (SpeechRecCtor) {
      const recog = new SpeechRecCtor();
      recog.lang = 'ko-KR';
      recog.continuous = true;
      recog.interimResults = true;

      let accumulated = '';
      recog.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            accumulated += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInterimText(accumulated + interim);
      };
      recog.onerror = () => {};
      recog.start();
      recognitionRef.current = recog;
    }

    // ── 2. MediaRecorder: Whisper 최종 전송용 ───────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      alert('마이크 접근 권한이 필요합니다.');
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setInterimText('');
      return;
    }

    if (shouldStopRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setInterimText('');
      return;
    }

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setRecording(false);
      setInterimText('');

      const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      chunksRef.current = [];
      if (rawBlob.size === 0) return;

      try {
        const wavBlob = await toWav(rawBlob);
        const text = (await voiceService.transcribe(wavBlob)).trim();
        if (!text) return;
        if (autoSendRef.current) onAutoSendRef.current(text);
        else onTranscribedRef.current(text);
      } catch (err) {
        console.error('Whisper STT 오류', err);
      }
    };

    recorder.start();
    setRecording(true);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    } else {
      shouldStopRef.current = true;
    }
  }, []);

  // 스페이스바 PTT
  useEffect(() => {
    let pressed = false;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || pressed) return;
      if (document.activeElement === inputRef.current) return;
      e.preventDefault();
      pressed = true;
      start(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      pressed = false;
      stop();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [start, stop, inputRef]);

  return { recording, interimText, start, stop };
}

// WebM/Opus → 16kHz mono WAV
async function toWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioContext();
  const decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  await decodeCtx.close();
  const targetSr = 16_000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetSr), targetSr);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  if (decoded.numberOfChannels > 1) {
    const splitter = offline.createChannelSplitter(decoded.numberOfChannels);
    const merger = offline.createChannelMerger(1);
    src.connect(splitter);
    for (let i = 0; i < decoded.numberOfChannels; i++) splitter.connect(merger, i, 0);
    merger.connect(offline.destination);
  } else {
    src.connect(offline.destination);
  }
  src.start(0);
  const resampled = await offline.startRendering();
  return encodeWav(resampled);
}

function encodeWav(buf: AudioBuffer): Blob {
  const sr = buf.sampleRate;
  const samples = buf.getChannelData(0);
  const dataLen = samples.length * 2;
  const ab = new ArrayBuffer(44 + dataLen);
  const v = new DataView(ab);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + dataLen, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, dataLen, true);
  let off = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([ab], { type: 'audio/wav' });
}
