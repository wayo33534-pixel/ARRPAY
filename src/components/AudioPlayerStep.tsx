import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Download,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Music,
  Sparkles,
  ExternalLink,
  Share2,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AudioResult } from '../types';

interface AudioPlayerStepProps {
  audioResult: AudioResult;
  onReset: () => void;
}

export const AudioPlayerStep: React.FC<AudioPlayerStepProps> = ({ audioResult, onReset }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioResult.duration || 0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Convert Base64 directly into a Blob for 100% reliable local client-side download
  const handleDownload = async (format: 'mp3' | 'wav' = 'mp3') => {
    setIsDownloading(true);
    setDownloadError(null);

    try {
      let blob: Blob;

      // 1. Primary method: Direct client-side Base64 decode (0ms network dependency, works in all iframes)
      if (format === 'mp3' && audioResult.audioBase64) {
        const binary = atob(audioResult.audioBase64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'audio/mpeg' });
      } else {
        // Fetch from API
        const response = await fetch(`/api/download/${audioResult.sessionId}?format=${format}`);
        if (!response.ok) {
          // Secondary fallback to JSON audio data
          const dataRes = await fetch(`/api/audio-data/${audioResult.sessionId}?format=${format}`);
          const data = await dataRes.json();
          if (data.success && data.audioBase64) {
            const binary = atob(data.audioBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            blob = new Blob([bytes], { type: data.mimeType || 'audio/mpeg' });
          } else {
            throw new Error('ဖိုင် ရယူ၍ မရရှိပါ');
          }
        } else {
          blob = await response.blob();
        }
      }

      const filename = `arrpay_recap_myanmar_voiceover.${format}`;

      // 2. Trigger programmatic download via Object URL
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.style.position = 'fixed';
      anchor.style.top = '-9999px';
      anchor.style.left = '-9999px';
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();

      setTimeout(() => {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err: any) {
      console.error('Download error:', err);
      // Fallback: Direct window location or tab
      try {
        window.open(`/api/download/${audioResult.sessionId}?format=${format}`, '_blank');
      } catch {
        setDownloadError('ဒေါင်းလုဒ် ပြုလုပ်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်: ' + (err.message || ''));
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Mobile Web Share API
  const handleShare = async () => {
    try {
      if (!audioResult.audioBase64) return;
      const binary = atob(audioResult.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const file = new File([blob], 'arrpay_recap_myanmar_voiceover.mp3', { type: 'audio/mpeg' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'ARRPAY RECAP Myanmar Voice-over',
          text: 'AI ဖြင့် ဖန်တီးထားသော မြန်မာ Movie Recap အသံဖိုင်',
          files: [file],
        });
      } else {
        handleDownload('mp3');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleDownload('mp3');
      }
    }
  };

  const audioSource = audioResult.streamUrl || `data:audio/mp3;base64,${audioResult.audioBase64}`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Success banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-950 to-zinc-950 border border-emerald-800/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-700/80 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              မြန်မာ Movie Recap အသံဖိုင် ဖန်တီးပြီးပါပြီ!
            </h3>
            <p className="text-xs text-zinc-400">
              အောက်တွင် တိုက်ရိုက်နားဆင်နိုင်ပြီး စက်ထဲသို့ အခမဲ့ Download ရယူနိုင်ပါသည်
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="px-3 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-medium">
            {audioResult.voiceName}
          </span>
          <span className="px-3 py-1 rounded-full bg-red-950/80 text-red-400 border border-red-900 font-mono">
            {audioResult.speed.toFixed(2)}x Speed
          </span>
        </div>
      </div>

      {/* Download success / error alert */}
      {downloadSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>အသံဖိုင် ဒေါင်းလုဒ်စတင်ပါပြီ။ ဖုန်း/ကွန်ပျူတာ၏ Download ဖိုဒါတွင် ကြည့်ရှုနိုင်ပါသည်။</span>
        </div>
      )}

      {downloadError && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Hidden audio element for custom controls */}
      <audio ref={audioRef} src={audioSource} preload="metadata" />

      {/* Custom Cinema Audio Player */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow ambient background effect */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />

        {/* Player Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <Music className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">ဇာတ်လမ်းပြော အသံဖိုင်</span>
              <span className="text-sm font-bold text-white">arrpay_recap_myanmar_voiceover.mp3</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 text-red-400 border border-zinc-800">
              Voice: {audioResult.voiceName}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
              Speed: {audioResult.speed.toFixed(2)}x
            </span>
          </div>
        </div>

        {/* Timeline & Progress Bar */}
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-red-600 h-2 bg-zinc-900 rounded-lg cursor-pointer transition-all"
          />

          <div className="flex justify-between text-xs text-zinc-400 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* Play/Pause Button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-red-950/60 transition-transform cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                  setCurrentTime(0);
                }
              }}
              className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="အစမှ ပြန်ဖွင့်မည်"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800/80">
            <button
              type="button"
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 sm:w-24 accent-red-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Native Audio Player backup for native browser three-dots download menu */}
        <div className="pt-2">
          <audio
            controls
            src={audioSource}
            className="w-full h-10 rounded-xl bg-zinc-900 border border-zinc-800"
          />
        </div>

        {/* Download Buttons Section */}
        <div className="pt-6 border-t border-zinc-900 flex flex-col sm:flex-row items-center gap-3">
          {/* Main MP3 Download Button */}
          <button
            type="button"
            onClick={() => handleDownload('mp3')}
            disabled={isDownloading}
            className="w-full sm:flex-1 py-4 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-xl shadow-red-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : downloadSuccess ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            <span>
              {isDownloading
                ? 'ဒေါင်းလုဒ် ပြုလုပ်နေပါသည်...'
                : downloadSuccess
                ? 'ဒေါင်းလုဒ် အောင်မြင်ပါသည်!'
                : 'အသံဖိုင် Download လုပ်မည် (MP3)'}
            </span>
          </button>

          {/* WAV Download Button */}
          <button
            type="button"
            onClick={() => handleDownload('wav')}
            disabled={isDownloading}
            className="w-full sm:w-auto py-4 px-5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            title="အသံအရည်အသွေးမြင့် WAV ဖိုင် ဒေါင်းလုဒ်လုပ်မည်"
          >
            <Sparkles className="w-4 h-4 text-red-400" />
            <span>WAV ရယူမည်</span>
          </button>

          {/* Direct Tab / Open fallback */}
          <a
            href={audioResult.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto py-4 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white font-medium text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="တိုက်ရိုက်လင့်ခ်ဖြင့် ဖွင့်မည်"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">တိုက်ရိုက်ဖွင့်မည်</span>
          </a>
        </div>
      </div>
    </div>
  );
};
