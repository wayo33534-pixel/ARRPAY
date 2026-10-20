import React from 'react';
import { Film, Sparkles, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  showResetButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, showResetButton }) => {
  return (
    <header className="border-b border-zinc-800/80 bg-black/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:py-4">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-700 to-red-500 flex items-center justify-center shadow-lg shadow-red-950/40 border border-red-500/30">
            <Film className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
                ARRPAY <span className="text-red-500">RECAP</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-red-950/80 text-red-400 border border-red-800/60">
                <Sparkles className="w-3 h-3 text-red-400" />
                AI Myanmar TTS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium">
              AI ဖြင့် မြန်မာ Movie Recap အသံဖန်တီးပါ
            </p>
          </div>
        </div>

        {showResetButton && onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-300 bg-zinc-900/90 hover:bg-zinc-800 hover:text-white rounded-lg border border-zinc-700/80 transition-all shadow-sm active:scale-95"
            title="ဗီဒီယိုအသစ် ပြန်လည်စတင်မည်"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">ဗီဒီယိုအသစ် ပြန်လုပ်မည်</span>
            <span className="sm:hidden">အသစ်လုပ်မည်</span>
          </button>
        )}
      </div>
    </header>
  );
};
