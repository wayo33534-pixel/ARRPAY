import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StepProgress } from './components/StepProgress';
import { VideoUploadStep } from './components/VideoUploadStep';
import { TranscriptStep } from './components/TranscriptStep';
import { VoiceSelectionStep } from './components/VoiceSelectionStep';
import { AudioPlayerStep } from './components/AudioPlayerStep';
import { ResetConfirmModal } from './components/ResetConfirmModal';
import { WorkflowStep, VoiceOption, AudioResult } from './types';
import { AlertCircle, RotateCcw, Sparkles, Layers, ShieldAlert } from 'lucide-react';

const DEFAULT_VOICES: VoiceOption[] = [
  {
    id: 'Puck',
    name: 'ပတ်ခ် (Puck)',
    gender: 'အမျိုးသား (Male)',
    tag: 'တက်ကြွကြည်လင်',
    description: 'အသံထွက်ပြတ်သားပြီး ဇာတ်လမ်းအက်ရှင်နှင့် စိတ်လှုပ်ရှားဖွယ် ဇာတ်ဝင်ခန်းများအတွက် အထူးသင့်လျော်ပါသည်။',
  },
  {
    id: 'Charon',
    name: 'ခါရွန် (Charon)',
    gender: 'အမျိုးသား (Male)',
    tag: 'နက်ရှိုင်းတည်ငြိမ်',
    description: 'သြဇာအပြည့်ရှိပြီး သည်းထိတ်ရင်ဖို၊ စုံထောက်နှင့် လျှို့ဝှက်ဆန်းကြယ် ဇာတ်လမ်းများအတွက် အကောင်းဆုံးဖြစ်ပါသည်။',
  },
  {
    id: 'Kore',
    name: 'ကိုရီ (Kore)',
    gender: 'အမျိုးသမီး (Female)',
    tag: 'ကြည်လင်ချိုသာ',
    description: 'နားဆင်ရ ချိုသာကြည်လင်ပြီး ဒရမ်မာ၊ အချစ်နှင့် စိတ်ခံစားမှုပြင်းပြသော ဇာတ်လမ်းများအတွက် သင့်လျော်ပါသည်။',
  },
  {
    id: 'Fenrir',
    name: 'ဖန်ရီယာ (Fenrir)',
    gender: 'အမျိုးသား (Male)',
    tag: 'ဇာတ်လမ်းပြောစတိုင်',
    description: 'ရုပ်ရှင်ဇာတ်လမ်းပြော (Movie Recap) စစ်စစ်ခံစားမှုမျိုး ပေးစွမ်းနိုင်သော အားပါသောအသံ ဖြစ်ပါသည်။',
  },
  {
    id: 'Zephyr',
    name: 'ဇက်ဖာ (Zephyr)',
    gender: 'အမျိုးသမီး (Female)',
    tag: 'နွေးထွေးဆွဲဆောင်မှု',
    description: 'သဘာဝကျကျ ရှင်းလင်းပြောကြားတတ်ပြီး ပရိသတ်ကို ဆွဲဆောင်နိုင်သော အသံဟန် ဖြစ်ပါသည်။',
  },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);

  const [transcript, setTranscript] = useState('');
  const [isTranscriptComplete, setIsTranscriptComplete] = useState(false);

  const [voices, setVoices] = useState<VoiceOption[]>(DEFAULT_VOICES);
  const [selectedVoiceId, setSelectedVoiceId] = useState('Puck');
  const [speed, setSpeed] = useState(1.0);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const voiceSectionRef = useRef<HTMLDivElement>(null);

  // Fetch initial system status and voices
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && data.voices.length > 0) {
          setVoices(data.voices);
        }
        if (data.hasApiKey === false) {
          setApiKeyMissing(true);
        }
      })
      .catch((err) => console.warn('Could not check system status:', err));
  }, []);

  // Handle Video Processing
  const handleStartProcessingVideo = (file: File) => {
    setVideoFile(file);
    setIsProcessingVideo(true);
    setUploadProgress(10);
    setErrorMessage(null);
    setCurrentStep('processing-video');

    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/process-video');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 70); // 0-70% upload
        setUploadProgress(Math.max(10, percent));
      }
    };

    xhr.onload = () => {
      setIsProcessingVideo(false);
      setUploadProgress(100);

      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.success) {
          setTranscript(res.transcript || '');
          setIsTranscriptComplete(true);
          setCurrentStep('transcript-ready');
        } else {
          setErrorMessage(res.error || 'ဗီဒီယို စိစစ်ဖော်ထုတ်ရာတွင် အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်');
          setCurrentStep('upload');
        }
      } catch {
        setErrorMessage('ဆာဗာမှ ပြန်ကြားချက်အား ဖတ်ရှု၍ မရရှိပါ');
        setCurrentStep('upload');
      }
    };

    xhr.onerror = () => {
      setIsProcessingVideo(false);
      setErrorMessage('ကွန်ရက် ချိတ်ဆက်မှု အဆင်မပြေပါ သို့မဟုတ် ဗီဒီယို တင်သွင်းမှု ပျက်ပြယ်သွားပါသည်');
      setCurrentStep('upload');
    };

    xhr.send(formData);
  };

  // Handle Proceed from Transcript to Voice Selection
  const handleProceedToVoice = () => {
    if (voiceSectionRef.current) {
      voiceSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle Final Audio Generation
  const handleGenerateAudio = async () => {
    if (!transcript.trim()) {
      setErrorMessage('အသံဖန်တီးရန် မြန်မာစာ Transcript လိုအပ်ပါသည်');
      return;
    }

    setIsGeneratingAudio(true);
    setErrorMessage(null);
    setGenerationStage('မြန်မာစာ Transcript အား ပြင်ဆင်နေသည်...');

    const stageTimer1 = setTimeout(() => {
      setGenerationStage('မြန်မာအသံ ထွက်ပေါ်လာစေရန် AI ဖြင့် ဖန်တီးနေသည်...');
    }, 1500);

    const stageTimer2 = setTimeout(() => {
      setGenerationStage('အသံဖိုင်များကို စနစ်တကျ ပေါင်းစပ်နေသည်...');
    }, 4500);

    const stageTimer3 = setTimeout(() => {
      setGenerationStage('အမြန်နှုန်း ညှိနှိုင်းပြီး အသံဖိုင် အချောသတ်နေသည်...');
    }, 7000);

    try {
      const res = await fetch('/api/generate-voiceover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          voiceName: selectedVoiceId,
          speed,
        }),
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'မြန်မာအသံ ဖန်တီးရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်');
      }

      setAudioResult(data);
      setCurrentStep('audio-ready');
    } catch (err: any) {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      clearTimeout(stageTimer3);
      setErrorMessage(err.message || 'မြန်မာအသံ ဖန်တီးခြင်း မအောင်မြင်ပါ');
    } finally {
      setIsGeneratingAudio(false);
      setGenerationStage('');
    }
  };

  // Reset to new video
  const handleConfirmReset = async () => {
    if (audioResult?.sessionId) {
      try {
        await fetch('/api/reset-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: audioResult.sessionId }),
        });
      } catch {}
    }

    setVideoFile(null);
    setTranscript('');
    setIsTranscriptComplete(false);
    setSelectedVoiceId('Puck');
    setSpeed(1.0);
    setAudioResult(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setIsProcessingVideo(false);
    setIsGeneratingAudio(false);
    setIsResetModalOpen(false);
    setCurrentStep('upload');
  };

  const handleRequestReset = () => {
    if (currentStep === 'upload' && !videoFile && !transcript) {
      return;
    }
    setIsResetModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      {/* Top Header */}
      <Header
        onReset={handleRequestReset}
        showResetButton={currentStep !== 'upload' || Boolean(videoFile) || Boolean(transcript)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* API Key Missing Alert if applicable */}
        {apiKeyMissing && (
          <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex items-start gap-3 shadow-lg">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-300">GEMINI_API_KEY လိုအပ်ပါသည်</p>
              <p className="text-zinc-300">
                AI Studio ၏ Secrets panel တွင် <b>GEMINI_API_KEY</b> သတ်မှတ်ထားရှိကြောင်း သေချာပါစေ။
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner with Retry */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs sm:text-sm flex items-start justify-between gap-3 shadow-xl animate-in fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-red-300">အမှားအယွင်း ဖြစ်ပေါ်ခဲ့သည်</p>
                <p className="text-zinc-200">{errorMessage}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
            >
              ပိတ်မည်
            </button>
          </div>
        )}

        {/* Workflow Step Indicator */}
        <StepProgress currentStep={currentStep} />

        {/* STEP 1: Video Upload */}
        {(currentStep === 'upload' || currentStep === 'processing-video') && (
          <section className="animate-in fade-in duration-300">
            <VideoUploadStep
              onStartProcessing={handleStartProcessingVideo}
              isProcessing={isProcessingVideo}
              uploadProgress={uploadProgress}
            />
          </section>
        )}

        {/* STEP 2-4: Myanmar Transcript Ready */}
        {(currentStep === 'transcript-ready' || currentStep === 'generating-audio' || currentStep === 'audio-ready') && (
          <section className="space-y-8 animate-in fade-in duration-300">
            <TranscriptStep
              transcript={transcript}
              onChangeTranscript={setTranscript}
              onProceedToVoice={handleProceedToVoice}
              isCompleted={isTranscriptComplete}
            />

            {/* STEP 5-7: Voice Selection & Speed Control & Generate */}
            <div ref={voiceSectionRef} className="pt-2">
              <VoiceSelectionStep
                voices={voices}
                selectedVoiceId={selectedVoiceId}
                onSelectVoice={setSelectedVoiceId}
                speed={speed}
                onChangeSpeed={setSpeed}
                onGenerateAudio={handleGenerateAudio}
                isGenerating={isGeneratingAudio}
                generationStage={generationStage}
              />
            </div>
          </section>
        )}

        {/* STEP 8: Final Audio Player & Download */}
        {currentStep === 'audio-ready' && audioResult && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
            <AudioPlayerStep audioResult={audioResult} onReset={handleRequestReset} />
          </section>
        )}
      </main>

      {/* Safety Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onConfirm={handleConfirmReset}
        onCancel={() => setIsResetModalOpen(false)}
      />

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-900/80 py-6 px-4 text-center text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>ARRPAY RECAP &copy; 2026. AI Myanmar Movie Recap Studio.</span>
          <span className="text-zinc-600">Powered by Google Gemini AI & TTS</span>
        </div>
      </footer>
    </div>
  );
}
