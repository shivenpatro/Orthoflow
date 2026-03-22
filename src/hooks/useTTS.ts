"use client";

/**
 * useTTS.ts — Text-to-Speech hook using Web Speech API.
 *
 * Manages a speech queue to prevent overlapping utterances.
 * Respects a cooldown between successive messages to avoid TTS spam.
 */

import { useRef, useCallback, useEffect } from "react";

const DEFAULT_RATE = 0.95;
const DEFAULT_PITCH = 1.05;
const MIN_COOLDOWN_MS = 2500; // minimum gap between spoken messages

export function useTTS(enabled: boolean = true) {
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const lastSpeakTimeRef = useRef<number>(0);
  const queueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const processQueue = useCallback(() => {
    if (!synthRef.current || isSpeakingRef.current || queueRef.current.length === 0) return;
    const text = queueRef.current.shift()!;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = DEFAULT_RATE;
    utterance.pitch = DEFAULT_PITCH;
    utterance.volume = 1;

    // Prefer a natural English voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Female"))
    ) ?? voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { isSpeakingRef.current = true; };
    utterance.onend = () => {
      isSpeakingRef.current = false;
      processQueue();
    };
    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processQueue();
    };

    synthRef.current.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string, urgent = false) => {
      if (!enabled || !synthRef.current) return;
      const now = Date.now();
      if (!urgent && now - lastSpeakTimeRef.current < MIN_COOLDOWN_MS) return;
      lastSpeakTimeRef.current = now;

      if (urgent) {
        synthRef.current.cancel();
        queueRef.current = [text];
        isSpeakingRef.current = false;
      } else {
        // Don't stack too many messages
        if (queueRef.current.length < 2) {
          queueRef.current.push(text);
        }
      }

      processQueue();
    },
    [enabled, processQueue]
  );

  const cancel = useCallback(() => {
    synthRef.current?.cancel();
    queueRef.current = [];
    isSpeakingRef.current = false;
  }, []);

  return { speak, cancel };
}
