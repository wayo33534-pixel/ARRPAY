import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Close Button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-white">
              ဗီဒီယိုအသစ် စတင်မည်လား။
            </h4>
            <p className="text-xs text-zinc-400">အတည်ပြုချက် တောင်းခံခြင်း</p>
          </div>
        </div>

        {/* Warning text */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          ဗီဒီယိုအသစ် ပြန်လည်စတင်ပါက ယခု လုပ်ဆောင်ထားသော မူရင်းဗီဒီယို၊ မြန်မာစာ Transcript နှင့် ဖန်တီးထားသော အသံဖိုင်များ အားလုံး ပျက်ပြယ်သွားပါမည်။
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            မလုပ်တော့ပါ (Cancel)
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-950/60 transition-all cursor-pointer"
          >
            ဗီဒီယိုအသစ် စတင်မည်
          </button>
        </div>
      </div>
    </div>
  );
};
