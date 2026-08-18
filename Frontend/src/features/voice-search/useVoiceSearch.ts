import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal structural types for the Web Speech API.
 *
 * `lib.dom` still does not ship these, and the vendor-prefixed constructor is
 * the only one Chrome exposes, so the shape is declared locally rather than
 * pulling in a types package for two call sites.
 */
interface SpeechRecognitionAlternative {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export interface VoiceSearchApi {
  /** False on browsers without the API — callers should hide the trigger. */
  supported: boolean;
  listening: boolean;
  /** Live partial transcript, so the UI can echo speech as it is recognised. */
  transcript: string;
  start: () => void;
  stop: () => void;
}

/**
 * Voice search.
 *
 * Resolves a final transcript through `onResult`. Interim results are exposed
 * separately so the field can show words appearing as they are spoken — a
 * silent button that only reacts once you stop talking reads as broken.
 *
 * `uz-UZ` leads with an `en-US` fallback because Uzbek recognition coverage is
 * patchy; the browser picks the closest model it actually has.
 */
export function useVoiceSearch(onResult: (transcript: string) => void): VoiceSearchApi {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Held in a ref so re-creating the callback upstream does not tear down an
  // in-flight recognition session.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const supported = getRecognitionCtor() !== null;

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    recognitionRef.current?.abort();

    const recognition = new Ctor();
    recognition.lang = navigator.language?.startsWith('uz') ? 'uz-UZ' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]!;
        const text = result[0].transcript;
        if (result.isFinal) {
          setTranscript(text);
          onResultRef.current(text.trim());
          return;
        }
        interim += text;
      }
      setTranscript(interim);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setTranscript('');
    setListening(true);
    recognition.start();
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop };
}
