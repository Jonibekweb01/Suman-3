import { useEffect, useState } from 'react';

/** Small, fast string hash — good enough to seed deterministic "randomness" per id. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Deterministic countdown end-time for a given id.
 *
 * Real "deal ends at" timestamps live on the backend; until that field
 * exists, every shopper should still see the SAME countdown for the same
 * product on every render (not a fresh random each mount), so it is derived
 * from the id rather than `Date.now() + random()`.
 */
export function dealEndTime(id: string): number {
  const hash = hashString(id);
  // Spread deals between 45 minutes and ~18 hours out.
  const spreadMs = (hash % (18 * 60 * 60 * 1000)) + 45 * 60 * 1000;
  // Anchored to the start of the current hour so it does not drift on re-render.
  const anchor = Math.floor(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000);
  return anchor + spreadMs;
}

/** Deterministic "only N left" scarcity indicator, stable per id. */
export function scarcityCount(id: string): number {
  return (hashString(id) % 8) + 2; // 2..9
}

export interface CountdownParts {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function toParts(remainingMs: number): CountdownParts {
  const totalSeconds = Math.max(Math.floor(remainingMs / 1000), 0);
  return {
    totalSeconds,
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: totalSeconds <= 0,
  };
}

/** Ticking countdown to a fixed epoch millisecond timestamp. */
export function useCountdown(targetMs: number): CountdownParts {
  const [parts, setParts] = useState(() => toParts(targetMs - Date.now()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setParts(toParts(targetMs - Date.now()));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  return parts;
}

export function formatClock(parts: CountdownParts): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)}`;
}
