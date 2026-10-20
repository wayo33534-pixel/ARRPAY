import React from 'react';
import { Upload, Headphones, FileText, Sliders, CheckCircle } from 'lucide-react';
import { WorkflowStep } from '../types';

interface StepProgressProps {
  currentStep: WorkflowStep;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => {
  const steps = [
    { id: 'upload', label: 'ဗီဒီယို တင်ခြင်း', icon: Upload },
    { id: 'processing-video', label: 'စိစစ်/ဘာသာပြန်', icon: Headphones },
    { id: 'transcript-ready', label: 'မြန်မာစာ Transcript', icon: FileText },
    { id: 'generating-audio', label: 'အသံဖန်တီးခြင်း', icon: Sliders },
    { id: 'audio-ready', label: 'အသံဖိုင် ရယူခြင်း', icon: CheckCircle },
  ];

  const getStepIndex = (step: WorkflowStep) => {
    switch (step) {
      case 'upload':
        return 0;
      case 'processing-video':
        return 1;
      case 'transcript-ready':
        return 2;
      case 'generating-audio':
        return 3;
      case 'audio-ready':
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full py-4 px-2 sm:px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-5 gap-1 sm:gap-2 relative">
          {/* Connector line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-zinc-800 -z-0 hidden sm:block">
            <div
              className="h-full bg-red-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentIndex / 4) * 100}%` }}
            />
          </div>

          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.id} className="flex flex-col items-center text-center relative z-10">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all duration-300 border text-xs sm:text-sm font-bold ${
                    isCompleted
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-950/50'
                      : isCurrent
                      ? 'bg-zinc-900 border-red-500 text-red-400 ring-2 ring-red-500/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span
                  className={`mt-1.5 text-[10px] sm:text-xs font-medium tracking-tight line-clamp-1 transition-colors ${
                    isCurrent
                      ? 'text-white font-semibold'
                      : isCompleted
                      ? 'text-zinc-300'
                      : 'text-zinc-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
