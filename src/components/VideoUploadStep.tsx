import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Film, AlertCircle, Play, FileVideo, CheckCircle2, Clock, HardDrive, Sparkles } from 'lucide-react';
import { VideoInfo } from '../types';

interface VideoUploadStepProps {
  onStartProcessing: (file: File) => void;
  isProcessing: boolean;
  uploadProgress: number;
}

const MAX_SIZE_BYTES = 700 * 1024 * 1024; // 700 MB
const MAX_DURATION_SECONDS = 20 * 60; // 20 minutes (1200s)

export const VideoUploadStep: React.FC<VideoUploadStepProps> = ({
  onStartProcessing,
  isProcessing,
  uploadProgress,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Clean up object URL when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (selectedVideo?.previewUrl) {
        URL.revokeObjectURL(selectedVideo.previewUrl);
      }
    };
  }, [selectedVideo]);

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const validateAndSelectFile = (file: File) => {
    setErrorMessage(null);

    // 1. Check format
    const validExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'];
    const fileName = file.name.toLowerCase();
    const isExtensionValid = validExtensions.some((ext) => fileName.endsWith(ext));
    const isMimeValid = file.type.startsWith('video/');

    if (!isExtensionValid && !isMimeValid) {
      setErrorMessage('ဖိုင်အမျိုးအစား မမှန်ကန်ပါ။ MP4, MOV, WebM, MKV ဖိုင်များကိုသာ တင်သွင်းနိုင်ပါသည်။');
      return;
    }

    // 2. Check file size (700 MB limit)
    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(`ဖိုင်အရွယ်အစား 700 MB ထက် ကြီးမားနေပါသည် (${formatFileSize(file.size)})။ ကျေးဇူးပြု၍ 700 MB အောက် ဗီဒီယိုဖိုင် ရွေးချယ်ပေးပါ။`);
      return;
    }

    setIsValidating(true);
    const url = URL.createObjectURL(file);

    // Create temp video to inspect duration
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;

    tempVideo.onloadedmetadata = () => {
      setIsValidating(false);
      const duration = tempVideo.duration;

      // 3. Check duration (20 minutes limit)
      if (duration > MAX_DURATION_SECONDS) {
        URL.revokeObjectURL(url);
        setErrorMessage(
          `ဗီဒီယို ကြာချိန် ၂၀ မိနစ်ထက် ကျော်လွန်နေပါသည် (${formatDuration(duration)})။ အများဆုံး ၂၀ မိနစ်အထိသာ ခွင့်ပြုထားပါသည်။`
        );
        return;
      }

      setSelectedVideo({
        file,
        name: file.name,
        size: file.size,
        duration: duration || 0,
        previewUrl: url,
      });
    };

    tempVideo.onerror = () => {
      setIsValidating(false);
      // Even if metadata probe fails in browser, allow server to inspect as long as size is within limits
      setSelectedVideo({
        file,
        name: file.name,
        size: file.size,
        duration: 0,
        previewUrl: url,
      });
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  // Helper to create a fast demo video clip (canvas stream recording) for immediate testing
  const createDemoVideo = async () => {
    setIsValidating(true);
    setErrorMessage(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d')!;

      // Create audio context to synthesize voice-over demo tone
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      const canvasStream = canvas.captureStream(30);
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        osc.stop();
        audioCtx.close();
        const blob = new Blob(chunks, { type: 'video/webm' });
        const demoFile = new File([blob], 'demo_movie_recap_clip.webm', { type: 'video/webm' });
        validateAndSelectFile(demoFile);
        setIsValidating(false);
      };

      recorder.start();

      let frame = 0;
      const renderInterval = setInterval(() => {
        frame++;
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, 640, 360);

        // Film clapperboard graphic
        ctx.fillStyle = '#e50914';
        ctx.fillRect(40, 40, 560, 20);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ARRPAY RECAP - MOVIE SCENE SAMPLE', 320, 150);

        ctx.fillStyle = '#a1a1aa';
        ctx.font = '16px sans-serif';
        ctx.fillText('Narration Voice: A suspenseful night in Yangon city...', 320, 200);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(320, 260, 20 + Math.sin(frame * 0.2) * 5, 0, Math.PI * 2);
        ctx.fill();

        if (frame >= 90) {
          clearInterval(renderInterval);
          recorder.stop();
        }
      }, 33);
    } catch (err) {
      setIsValidating(false);
      setErrorMessage('နမူနာဗီဒီယို ဖန်တီး၍ မရရှိပါ: ' + (err as any).message);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload Box */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-10 text-center transition-all duration-300 ${
          dragActive
            ? 'border-red-500 bg-red-950/20 scale-[1.01]'
            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/avi"
          className="hidden"
          onChange={handleFileChange}
          disabled={isProcessing || isValidating}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner group">
            <UploadCloud className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg sm:text-xl font-bold text-white">
              ဗီဒီယိုဖိုင်အား ဤနေရာသို့ ဆွဲထည့်ပါ
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400">
              သို့မဟုတ် သင့်ဖုန်း/ကွန်ပျူတာထဲမှ ရွေးချယ်နိုင်ပါသည်
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isValidating}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-sm font-semibold rounded-xl shadow-lg shadow-red-950/60 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <FileVideo className="w-4 h-4" />
              ဖိုင်ရွေးမည် (Browse Video)
            </button>

            <button
              type="button"
              onClick={createDemoVideo}
              disabled={isProcessing || isValidating}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 active:scale-95 text-zinc-300 hover:text-white text-xs sm:text-sm font-medium rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="စမ်းသပ်ရန် နမူနာဗီဒီယို အသုံးပြုမည်"
            >
              <Sparkles className="w-3.5 h-3.5 text-red-400" />
              နမူနာ Clip ဖြင့် စမ်းသပ်မည်
            </button>
          </div>

          {/* Guidelines & Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 pt-4 border-t border-zinc-900 w-full text-xs text-zinc-400">
            <div className="flex items-center justify-center gap-1.5 py-1">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span>အများဆုံးကြာချိန်: <b>၂၀ မိနစ်</b></span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1">
              <HardDrive className="w-3.5 h-3.5 text-red-400" />
              <span>အများဆုံးဖိုင်ဆိုဒ်: <b>700 MB</b></span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1">
              <Film className="w-3.5 h-3.5 text-red-400" />
              <span>အမျိုးအစား: <b>MP4, MOV, WebM</b></span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-sm flex items-start gap-3 shadow-lg animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-300">သတိပေးချက်</p>
            <p className="text-zinc-300 text-xs sm:text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Validating indicator */}
      {isValidating && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm flex items-center justify-center gap-3">
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span>ဗီဒီယိုဖိုင်အား စစ်ဆေးနေပါသည်...</span>
        </div>
      )}

      {/* Video Preview & Details Card */}
      {selectedVideo && !isValidating && (
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h4 className="text-sm sm:text-base font-bold text-white">
                ရွေးချယ်ထားသော ဗီဒီယို အချက်အလက်
              </h4>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 font-mono">
              {formatFileSize(selectedVideo.size)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Player Preview */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-inner">
              <video
                ref={videoPreviewRef}
                src={selectedVideo.previewUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Metadata Stats */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                <span className="text-zinc-400 block text-[11px]">ဖိုင်အမည် (File Name):</span>
                <span className="text-white font-medium break-all">{selectedVideo.name}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-400 block text-[11px]">ဗီဒီယို ကြာချိန် (Duration):</span>
                  <span className="text-white font-semibold font-mono text-base">
                    {formatDuration(selectedVideo.duration)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-1">
                  <span className="text-zinc-400 block text-[11px]">ဖိုင်ဆိုဒ် (File Size):</span>
                  <span className="text-white font-semibold font-mono text-base">
                    {formatFileSize(selectedVideo.size)}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                * ဗီဒီယိုမှ အသံလိုင်းတစ်ခုလုံးကို အစအဆုံး ဆွဲထုတ်ပြီး Movie Recap ဇာတ်လမ်းပြော စာသားအဖြစ် ပြောင်းလဲပေးမည် ဖြစ်ပါသည်။
              </p>
            </div>
          </div>

          {/* Upload and Processing Progress Bar */}
          {isProcessing && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  ဗီဒီယိုအား တင်သွင်းပြီး စိစစ်နေပါသည်...
                </span>
                <span className="text-zinc-400 font-mono font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onStartProcessing(selectedVideo.file)}
              disabled={isProcessing}
              className="w-full py-3.5 sm:py-4 px-6 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.99] text-white font-bold text-sm sm:text-base rounded-xl shadow-xl shadow-red-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current text-white" />
              <span>ဗီဒီယိုတင်ပြီး စတင်လုပ်ဆောင်မည်</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
