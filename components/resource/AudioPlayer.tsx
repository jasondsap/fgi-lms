'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * The episode player on the podcast shell. The MP3 lives in the private S3
 * bucket and arrives as a presigned URL (signed for 6 hours in lib/resources.ts
 * so a listener who walks away mid-episode can still finish it).
 *
 * The rail's "or, Listen Now!" button lives in a different grid cell, so the
 * two talk over a window event rather than through React state.
 */

/** Fired by ListenNowButton; the player scrolls itself into view and plays. */
const LISTEN_NOW_EVENT = 'rer-listen-now';

const RATES = [1, 1.25, 1.5, 2];

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

/** Round control shared by play and the ±15s skips. */
const ROUND = {
  border: 'none', borderRadius: '50%', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  fontFamily: 'inherit',
};

export default function AudioPlayer(
  { src, title, autoplay = false }: { src: string; title: string; autoplay?: boolean },
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [time,     setTime]     = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate,     setRate]     = useState(1);

  useEffect(() => {
    const onListenNow = () => {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      audioRef.current?.play().catch(() => { /* browser blocked autoplay */ });
    };
    window.addEventListener(LISTEN_NOW_EVENT, onListenNow);
    return () => window.removeEventListener(LISTEN_NOW_EVENT, onListenNow);
  }, []);

  // ?autoplay=1 — the Trailer button asks for playback on arrival. Best
  // effort: a same-site click usually satisfies Chrome's autoplay policy, but
  // when it doesn't, the rejection is swallowed and the player just sits ready.
  useEffect(() => {
    if (autoplay) audioRef.current?.play().catch(() => { /* blocked */ });
  }, [autoplay]);

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(audio.currentTime + delta, 0), duration || Infinity);
  };

  const cycleRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  return (
    <div
      ref={wrapRef}
      style={{
        background: 'var(--fgi-navy)', borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.5rem', color: '#ffffff',
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Play / pause */}
        <button
          type="button"
          onClick={() => (playing ? audioRef.current?.pause() : audioRef.current?.play())}
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          style={{ ...ROUND, width: '58px', height: '58px', background: 'var(--fgi-gold)', color: 'var(--fgi-navy)' }}
        >
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <rect x="5" y="4" width="5" height="16" rx="1.5" />
              <rect x="14" y="4" width="5" height="16" rx="1.5" />
            </svg>
          ) : (
            /* nudged right so the triangle reads centred */
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '3px' }}>
              <path d="M7 4.5v15a1 1 0 001.5.87l13-7.5a1 1 0 000-1.74l-13-7.5A1 1 0 007 4.5z" />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Seek */}
          <input
            type="range"
            className="rer-seek"
            min={0}
            max={duration || 0}
            step={1}
            value={Math.min(time, duration || 0)}
            aria-label="Seek"
            onChange={(e) => {
              const t = Number(e.target.value);
              setTime(t);
              if (audioRef.current) audioRef.current.currentTime = t;
            }}
            style={{ width: '100%', accentColor: 'var(--fgi-gold)' }}
          />

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: '4px',
          }}>
            <span style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>
              {fmt(time)} / {fmt(duration)}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button" onClick={() => skip(-15)} aria-label="Back 15 seconds"
                style={{
                  ...ROUND, width: '34px', height: '34px', fontSize: '11px', fontWeight: 700,
                  background: 'rgba(255,255,255,0.14)', color: '#ffffff',
                }}
              >
                −15
              </button>
              <button
                type="button" onClick={() => skip(15)} aria-label="Forward 15 seconds"
                style={{
                  ...ROUND, width: '34px', height: '34px', fontSize: '11px', fontWeight: 700,
                  background: 'rgba(255,255,255,0.14)', color: '#ffffff',
                }}
              >
                +15
              </button>
              <button
                type="button" onClick={cycleRate} aria-label={`Playback speed ${rate}x`}
                style={{
                  ...ROUND, borderRadius: '999px', minWidth: '52px', height: '34px',
                  fontSize: '13px', fontWeight: 700, padding: '0 10px',
                  background: 'rgba(255,255,255,0.14)', color: '#ffffff',
                }}
              >
                {rate}×
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** "or, Listen Now!" — the mockup's gold-ringed pill inside the Find Us On box. */
export function ListenNowButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(LISTEN_NOW_EVENT))}
      style={{
        display: 'block', width: '100%', background: '#ffffff',
        border: '3px solid var(--fgi-gold)', borderRadius: '999px',
        color: 'var(--fgi-navy)', fontWeight: 700, fontSize: '19px',
        fontFamily: 'inherit', padding: '10px 12px',
      }}
    >
      or, Listen Now!
    </button>
  );
}
