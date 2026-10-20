export interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  tag: string;
  description: string;
}

export type WorkflowStep =
  | 'upload'
  | 'processing-video'
  | 'transcript-ready'
  | 'generating-audio'
  | 'audio-ready';

export interface VideoInfo {
  file: File;
  name: string;
  size: number;
  duration: number;
  previewUrl: string;
}

export interface GenerationProgress {
  stage: string;
  percent: number;
  detail?: string;
}

export interface AudioResult {
  sessionId: string;
  downloadUrl: string;
  downloadWavUrl: string;
  streamUrl: string;
  audioBase64: string;
  duration: number;
  voiceName: string;
  speed: number;
}
