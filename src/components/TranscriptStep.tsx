import React, { useState } from 'react';
import { FileText, Copy, Check, CheckCircle2, Volume2, Edit3, Sparkles } from 'lucide-react';

interface TranscriptStepProps {
  transcript: string;
  onChangeTranscript: (text: string) => void;
  onProceedToVoice: () => void;
  isCompleted: boolean;
}

export const TranscriptStep: React.FC<TranscriptStepProps> = ({
  transcript,
  onChangeTranscript,
  onProceedToVoice,
  isCompleted,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.getElementById('transcript-textarea') as HTMLTextAreaElement;
      if (ta) {
        ta.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleSelectAll = () => {
    const ta = document.getElementById('transcript-textarea') as HTMLTextAreaElement;
    if (ta) {
      ta.focus();
      ta.select();
    }
  };

  const charCount = transcript.length;
  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              မြန်မာစာ Transcript
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            မူရင်းဗီဒီယိုမှ ကူးယူပြီး သဘာဝကျသော မြန်မာစကားပြော Movie Recap အဖြစ် ပြုစုထားသော စာသား
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{isCompleted ? 'အပြည့်အစုံ ကူးယူဘာသာပြန်ပြီးပါပြီ' : 'စာသား အဆင်သင့်ဖြစ်ပါပြီ'}</span>
        </div>
      </div>

      {/* Editor Container */}
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-900 pb-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-zinc-400" />
            <span>လိုအပ်ပါက စာသားကို မိမိစိတ်ကြိုက် တိုက်ရိုက် ပြင်ဆင်နိုင်ပါသည်</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              အားလုံးရွေးမည်
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-900/60 border-emerald-600 text-emerald-200'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'ကူးယူပြီးပါပြီ' : 'ကူးယူမည် (Copy)'}</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            id="transcript-textarea"
            rows={10}
            value={transcript}
            onChange={(e) => onChangeTranscript(e.target.value)}
            placeholder="မြန်မာစာ Transcript ဤနေရာတွင် ပေါ်လာပါမည်..."
            className="w-full bg-zinc-900/90 text-zinc-100 placeholder-zinc-600 rounded-xl p-4 text-sm sm:text-base leading-relaxed border border-zinc-800 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 outline-none resize-y transition-all font-sans"
          />
        </div>

        {/* Footer info: counts and action */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono">
            <span>အက္ခရာအရေအတွက်: <b className="text-zinc-200">{charCount}</b></span>
            <span>စကားလုံးအရေအတွက်: <b className="text-zinc-200">{wordCount}</b></span>
          </div>

          <button
            type="button"
            onClick={onProceedToVoice}
            disabled={!transcript.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-red-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Volume2 className="w-5 h-5" />
            <span>မြန်မာအသံဖြင့် ဖတ်မည်</span>
          </button>
        </div>
      </div>
    </div>
  );
};
