import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, RotateCcw, Sparkles, Check, Loader2, FastForward } from 'lucide-react';
import { VoiceOption } from '../types';

interface VoiceSelectionStepProps {
  voices: VoiceOption[];
  selectedVoiceId: string;
  onSelectVoice: (id: string) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  onGenerateAudio: () => void;
  isGenerating: boolean;
  generationStage: string;
}

export const VoiceSelectionStep: React.FC<VoiceSelectionStepProps> = ({
  voices,
  selectedVoiceId,
  onSelectVoice,
  speed,
  onChangeSpeed,
  onGenerateAudio,
  isGenerating,
  generationStage,
}) => {
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingSampleVoiceId, setLoadingSampleVoiceId] = useState<string | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cache sample audio URLs to avoid re-fetching
  const sampleCache = useRef<Map<string, string>>(new Map());

  const handlePlaySample = async (voiceId: string) => {
    // If clicking on already playing sample, stop it
    if (playingVoiceId === voiceId) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    // Stop existing audio
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
    }

    const cacheKey = `${voiceId}-${speed}`;
    if (sampleCache.current.has(cacheKey)) {
      const audioUrl = sampleCache.current.get(cacheKey)!;
      playAudioUrl(audioUrl, voiceId);
      return;
    }

    setLoadingSampleVoiceId(voiceId);
    try {
      const res = await fetch('/api/voice-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceName: voiceId, speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'နမူနာ အသံဖိုင် မရရှိပါ');

      const mime = data.mimeType || 'audio/wav';
      const audioUrl = `data:${mime};base64,${data.audioBase64}`;
      sampleCache.current.set(cacheKey, audioUrl);

      playAudioUrl(audioUrl, voiceId);
    } catch (err: any) {
      alert(err.message || 'နမူနာ အသံဖွင့်ရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်');
    } finally {
      setLoadingSampleVoiceId(null);
    }
  };

  const playAudioUrl = (url: string, voiceId: string) => {
    const audio = new Audio(url);
    sampleAudioRef.current = audio;
    audio.playbackRate = speed;
    audio.onended = () => {
      setPlayingVoiceId(null);
    };
    audio.onerror = () => {
      setPlayingVoiceId(null);
    };
    audio.play();
    setPlayingVoiceId(voiceId);
  };

  const getSpeedLabel = (val: number): string => {
    if (val === 1.0) return '၁.၀၀x (ပုံမှန်)';
    if (val < 1.0) return `${val.toFixed(2)}x (နှေး)`;
    return `${val.toFixed(2)}x (မြန်)`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Heading */}
      <div className="space-y-1.5 text-center sm:text-left">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide">
          မြန်မာအသံ ၅ မျိုးထဲမှ ရွေးချယ်ပါ
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400">
          မိမိ Movie Recap ဇာတ်လမ်းနှင့် လိုက်ဖက်မည့် AI အသံစတိုင်ကို နမူနာနားထောင်ပြီး ရွေးချယ်ပါ
        </p>
      </div>

      {/* 5 Voice Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {voices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isSamplePlaying = playingVoiceId === voice.id;
          const isSampleLoading = loadingSampleVoiceId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice.id)}
              className={`relative rounded-2xl p-4.5 transition-all duration-200 border cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-zinc-900 border-red-500 shadow-xl shadow-red-950/40 ring-1 ring-red-500/50'
                  : 'bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
              }`}
            >
              <div className="space-y-2.5">
                {/* Header of card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      {voice.name}
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white stroke-[3]" />
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-zinc-400 font-medium">{voice.gender}</span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300">
                    {voice.tag}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                  {voice.description}
                </p>
              </div>

              {/* Sample playback button */}
              <div className="pt-4 border-t border-zinc-900/90 mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlaySample(voice.id);
                  }}
                  disabled={isSampleLoading}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSamplePlaying
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white'
                  }`}
                >
                  {isSampleLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                  ) : isSamplePlaying ? (
                    <Pause className="w-3.5 h-3.5 fill-current" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isSamplePlaying ? 'ရပ်တန့်မည်' : 'နမူနာနားထောင်မည်'}</span>
                </button>

                {isSelected ? (
                  <span className="text-[11px] font-bold text-red-500">ရွေးချယ်ထားသည်</span>
                ) : (
                  <span className="text-[11px] text-zinc-600">ရွေးရန် နှိပ်ပါ</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Speed Control Section */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
          <div className="flex items-center gap-2">
            <FastForward className="w-5 h-5 text-red-500" />
            <h4 className="text-base sm:text-lg font-bold text-white">
              အသံ အမြန်နှုန်း ညှိယူခြင်း (Speed Control)
            </h4>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-bold text-red-400 bg-red-950/60 border border-red-900/60 px-3 py-1 rounded-full font-mono">
              {getSpeedLabel(speed)}
            </span>

            {speed !== 1.0 && (
              <button
                type="button"
                onClick={() => onChangeSpeed(1.0)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="မူလအမြန်နှုန်းသို့ ပြန်ထားမည်"
              >
                <RotateCcw className="w-3 h-3 text-red-400" />
                မူလအမြန်နှုန်း
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <input
            type="range"
            min="0.75"
            max="1.50"
            step="0.05"
            value={speed}
            onChange={(e) => onChangeSpeed(parseFloat(e.target.value))}
            className="w-full accent-red-600 h-2 bg-zinc-900 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
            <span>0.75x (အေးဆေးနှေး)</span>
            <span>1.00x (မူလပုံမှန်)</span>
            <span>1.25x (သွက်လက်)</span>
            <span>1.50x (အမြန်ဆုံး)</span>
          </div>

          <p className="text-[11px] text-zinc-400">
            * ဇာတ်လမ်းပြောမြန်နှုန်းကို လိုသလို ညှိပြီးပါက အပေါ်ရှိ "နမူနာနားထောင်မည်" ခလုတ်ကို နှိပ်၍ အမြန်နှုန်းသစ်ဖြင့် ကြိုတင်နားထောင်နိုင်ပါသည်။
          </p>
        </div>
      </div>

      {/* Main Generate Voice-over Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerateAudio}
          disabled={isGenerating}
          className="w-full py-4 px-6 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-2xl shadow-red-950/60 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
        >
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Sparkles className="w-5 h-5 text-white" />
            )}
            <span>{isGenerating ? 'မြန်မာအသံ ဖန်တီးနေပါသည်...' : 'မြန်မာအသံ ဖန်တီးမည်'}</span>
          </div>
          {isGenerating && generationStage && (
            <span className="text-xs text-red-200 font-normal animate-pulse">
              {generationStage}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
