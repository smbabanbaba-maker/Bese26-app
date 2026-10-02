import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const WAVEFORM = [28, 42, 34, 58, 72, 46, 36, 64, 82, 54, 40, 68, 92, 56, 35, 63, 78, 45, 31, 58, 86, 52, 38, 70, 48, 32, 61, 77, 43, 29, 56, 72, 39, 30];

export function formatVoiceTime(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export default function VoiceNotePlayer({ src, mine = false, preview = false }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const progress = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) {
      audio.currentTime = 0;
      audio.load();
    }
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasError(false);
    return () => audio?.pause();
  }, [src]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setHasError(false);
    if (audio.paused) {
      if (audio.ended || (duration > 0 && audio.currentTime >= duration)) audio.currentTime = 0;
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        setHasError(true);
      }
    } else {
      audio.pause();
    }
  };

  const seek = (event) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const nextTime = Math.min(duration, Math.max(0, Number(event.currentTarget.value) || 0));
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const updateDuration = (event) => {
    const nextDuration = event.currentTarget.duration;
    if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
  };

  return (
    <div className={`voice-note-player${mine ? ' is-mine' : ''}${preview ? ' is-preview' : ''}`} role="group" aria-label={preview ? 'Voice note preview' : 'Voice message'}>
      <button type="button" className="voice-note-play" onClick={togglePlayback} aria-label={playing ? 'Pause voice message' : 'Play voice message'} title={playing ? 'Pause voice message' : 'Play voice message'}>
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
      </button>
      <div className="voice-note-track">
        <div className="voice-note-waveform" aria-hidden="true">
          {WAVEFORM.map((height, index) => <span key={index} className={index / WAVEFORM.length * 100 < progress ? 'is-played' : ''} style={{ height: `${height}%` }} />)}
        </div>
        <input
          className="voice-note-seek"
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          disabled={!duration || hasError}
          aria-label="Seek within voice message"
          aria-valuetext={`${formatVoiceTime(currentTime)} of ${formatVoiceTime(duration)}`}
        />
      </div>
      <time className="voice-note-time" aria-live="off">{formatVoiceTime(playing || currentTime > 0 ? currentTime : duration)}</time>
      {hasError && <span className="voice-note-error" role="status">Audio unavailable</span>}
      <audio
        ref={audioRef}
        className="voice-note-audio"
        src={src}
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onLoadedMetadata={updateDuration}
        onDurationChange={updateDuration}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={(event) => { setPlaying(false); setCurrentTime(event.currentTarget.duration || 0); }}
        onError={() => { setPlaying(false); setHasError(true); }}
      />
    </div>
  );
}
