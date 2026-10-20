import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload and temp directories
const TEMP_DIR = path.join(os.tmpdir(), 'arrpay_recap');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Multer storage for video uploads up to 700MB
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 700 * 1024 * 1024, // 700 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext) || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FORMAT'));
    }
  },
});

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Initialize GoogleGenAI SDK
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Supported Google Gemini TTS Voices
export const MYANMAR_TTS_VOICES = [
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

const SAMPLE_SENTENCE = 'မင်္ဂလာပါ။ ဒီနေ့မှာတော့ စိတ်ဝင်စားစရာကောင်းတဲ့ ဇာတ်လမ်းတစ်ပုဒ်ကို တင်ဆက်ပေးသွားမှာ ဖြစ်ပါတယ်။';

// Persistent in-memory and disk cache for the 5 voice samples to conserve API quota
const sampleAudioCache = new Map<string, string>();

// Multi-model TTS helper with fallback (tries gemini-3.8-flash-tts then gemini-3.8-flash-lite-tts)
async function generateTTSAudio(ai: GoogleGenAI, text: string, voiceId: string): Promise<string> {
  const models = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceId },
            },
          },
        },
      });

      const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audio) {
        return audio;
      }
    } catch (err: any) {
      console.warn(`TTS attempt with model ${model} failed:`, err?.message || err);
      lastError = err;
      // If 429 quota exceeded, try next model immediately
    }
  }

  throw lastError || new Error('အသံထုတ်လုပ်၍ မရရှိပါ');
}

// API: System & Config status
app.get('/api/status', async (_req, res) => {
  const hasApiKey = Boolean(process.env.GEMINI_API_KEY);
  let ffmpegAvailable = false;
  try {
    await execAsync('ffmpeg -version');
    ffmpegAvailable = true;
  } catch {
    ffmpegAvailable = false;
  }

  res.json({
    status: 'ok',
    hasApiKey,
    ffmpegAvailable,
    voices: MYANMAR_TTS_VOICES,
    sampleSentence: SAMPLE_SENTENCE,
    limits: {
      maxDurationMinutes: 20,
      maxSizeBytes: 700 * 1024 * 1024,
      allowedFormats: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
    },
  });
});

// API: Generate Voice Sample for 5 distinct Myanmar voices (with caching)
app.post('/api/voice-sample', async (req, res) => {
  try {
    const { voiceName, speed = 1.0 } = req.body;
    const voice = MYANMAR_TTS_VOICES.find((v) => v.id.toLowerCase() === (voiceName || '').toLowerCase()) || MYANMAR_TTS_VOICES[0];
    const numSpeed = parseFloat(speed);

    // Check if sample is cached
    let base64Audio = sampleAudioCache.get(voice.id);
    if (!base64Audio) {
      const ai = getGeminiClient();
      base64Audio = await generateTTSAudio(ai, SAMPLE_SENTENCE, voice.id);
      sampleAudioCache.set(voice.id, base64Audio);
    }

    // If speed is not 1.0, adjust speed using ffmpeg on cached audio
    if (!isNaN(numSpeed) && Math.abs(numSpeed - 1.0) > 0.02) {
      const sampleId = `sample-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const inWav = path.join(TEMP_DIR, `${sampleId}-in.wav`);
      const outMp3 = path.join(TEMP_DIR, `${sampleId}-out.mp3`);

      fs.writeFileSync(inWav, Buffer.from(base64Audio, 'base64'));
      await execAsync(`ffmpeg -y -i "${inWav}" -filter:a "atempo=${numSpeed}" -c:a libmp3lame -q:a 2 "${outMp3}"`);
      const modifiedAudio = fs.readFileSync(outMp3).toString('base64');

      try {
        fs.unlinkSync(inWav);
        fs.unlinkSync(outMp3);
      } catch {}

      return res.json({
        success: true,
        voiceId: voice.id,
        voiceName: voice.name,
        audioBase64: modifiedAudio,
        mimeType: 'audio/mp3',
        speed: numSpeed,
      });
    }

    res.json({
      success: true,
      voiceId: voice.id,
      voiceName: voice.name,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      speed: 1.0,
    });
  } catch (err: any) {
    console.error('Error generating voice sample:', err);
    const isQuota = err?.status === 'RESOURCE_EXHAUSTED' || (err?.message && err.message.includes('429'));
    res.status(500).json({
      error: isQuota
        ? 'Gemini TTS API ၏ အခမဲ့ Quota ကန့်သတ်ချက် ပြည့်သွားပါပြီ။ ကျေးဇူးပြု၍ ခဏစောင့်ဆိုင်းပြီးမှ ထပ်မံကြိုးစားပေးပါ။'
        : err.message === 'GEMINI_API_KEY_MISSING'
        ? 'GEMINI_API_KEY မရှိသေးပါ။ AI Studio Secrets တွင် သတ်မှတ်ပေးပါ။'
        : `အသံနမူနာ ဖန်တီးခြင်း မအောင်မြင်ပါ: ${err.message || 'အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်'}`,
    });
  }
});

// API: Process Video (Audio Extraction + Complete Transcription + Natural Myanmar Recap Translation)
app.post('/api/process-video', upload.single('video'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'ဗီဒီယိုဖိုင် ရွေးချယ်တင်သွင်းပေးပါ' });
  }

  const videoPath = file.path;
  const audioWavPath = path.join(TEMP_DIR, `${file.filename}-audio.wav`);
  const chunkPaths: string[] = [];

  try {
    // 1. Validate video duration using ffprobe
    let durationSeconds = 0;
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      durationSeconds = parseFloat(stdout.trim()) || 0;
    } catch (probeErr) {
      console.warn('ffprobe failed, trying ffmpeg duration check:', probeErr);
    }

    // 20 minutes limit = 1200 seconds
    if (durationSeconds > 1200) {
      // Clean up file
      try { fs.unlinkSync(videoPath); } catch {}
      return res.status(400).json({
        error: `ဗီဒီယို ကြာချိန် ၂၀ မိနစ်ထက် ကျော်လွန်နေပါသည် (${Math.round(durationSeconds / 60)} မိနစ် ဖြစ်နေပါသည်)။ အများဆုံး ၂၀ မိနစ်သာ ခွင့်ပြုပါသည်။`,
      });
    }

    // 2. Extract audio track to 16kHz mono WAV using ffmpeg
    await execAsync(`ffmpeg -y -i "${videoPath}" -vn -ar 16000 -ac 1 -c:a pcm_s16le "${audioWavPath}"`);
    if (!fs.existsSync(audioWavPath) || fs.statSync(audioWavPath).size < 1000) {
      throw new Error('ဗီဒီယိုမှ အသံဖိုင် ခွဲထုတ်၍ မရရှိပါ သို့မဟုတ် ဗီဒီယိုတွင် အသံလိုင်း မပါဝင်ပါ');
    }

    const ai = getGeminiClient();

    // 3. Segment audio if longer than 3 minutes (180s) to guarantee full capture without skipping
    let rawTranscripts: string[] = [];
    const CHUNK_DURATION = 180; // 3 minutes

    if (durationSeconds > CHUNK_DURATION) {
      const numChunks = Math.ceil(durationSeconds / CHUNK_DURATION);
      for (let i = 0; i < numChunks; i++) {
        const startSec = i * CHUNK_DURATION;
        const chunkPath = path.join(TEMP_DIR, `${file.filename}-chunk-${i}.wav`);
        chunkPaths.push(chunkPath);

        // Segment chunk with ffmpeg
        await execAsync(`ffmpeg -y -ss ${startSec} -t ${CHUNK_DURATION} -i "${audioWavPath}" -c copy "${chunkPath}"`);

        const chunkBuffer = fs.readFileSync(chunkPath);
        const base64Chunk = chunkBuffer.toString('base64');

        // Transcribe chunk using gemini-3.5-transcribe
        try {
          const transChunkRes = await ai.models.generateContent({
            model: 'gemini-3.5-transcribe',
            contents: {
              parts: [
                { inlineData: { mimeType: 'audio/wav', data: base64Chunk } },
                { text: 'Transcribe all spoken narration and dialogue accurately from beginning to end in this segment. Do not hallucinate or skip any words.' },
              ],
            },
          });

          let chunkText = '';
          const parts = transChunkRes.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            if ((p as any).audioTranscription?.text) {
              chunkText += (p as any).audioTranscription.text + ' ';
            } else if (p.text) {
              chunkText += p.text + ' ';
            }
          }
          if (chunkText.trim()) {
            rawTranscripts.push(`[အပိုင်း ${i + 1}]: ` + chunkText.trim());
          }
        } catch (chunkErr) {
          console.warn(`Chunk ${i} transcription error, falling back to gemini-3.8-flash:`, chunkErr);
          const flashRes = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              { inlineData: { mimeType: 'audio/wav', data: base64Chunk } },
              { text: 'Please transcribe all spoken dialogue and narration in this audio clip.' },
            ],
          });
          if (flashRes.text?.trim()) {
            rawTranscripts.push(`[အပိုင်း ${i + 1}]: ` + flashRes.text.trim());
          }
        }
      }
    } else {
      // Single chunk for short video
      const audioBuffer = fs.readFileSync(audioWavPath);
      const base64Audio = audioBuffer.toString('base64');

      const transRes = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
            { text: 'Transcribe all spoken narration and dialogue accurately from beginning to end. Do not omit any spoken speech.' },
          ],
        },
      });

      let transcribed = '';
      const parts = transRes.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if ((p as any).audioTranscription?.text) {
          transcribed += (p as any).audioTranscription.text + ' ';
        } else if (p.text) {
          transcribed += p.text + ' ';
        }
      }

      if (!transcribed.trim()) {
        // Fallback to gemini-3.8-flash
        const flashRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            { inlineData: { mimeType: 'audio/wav', data: base64Audio } },
            { text: 'Please transcribe all spoken dialogue and voice-over in this audio accurately.' },
          ],
        });
        transcribed = flashRes.text || '';
      }
      rawTranscripts.push(transcribed.trim());
    }

    const fullOriginalTranscribe = rawTranscripts.join('\n\n');

    // 4. Transform into fluent, natural spoken Myanmar Movie Recap narration
    const recapPrompt = `
သင်သည် အလွန်တော်သော မြန်မာ ရုပ်ရှင်ပြန်ပြောပြသူ (Professional Myanmar Movie Recap Narrator) တစ်ဦး ဖြစ်ပါသည်။
အောက်တွင် ပေးထားသော မူရင်းဗီဒီယိုမှ အသံကူးယူထားသည့် စကားပြောအချက်အလက်များကို အစမှအဆုံးထိ အစီအစဉ်မပျက် စိတ်ဝင်စားဖွယ် သဘာဝကျသော မြန်မာစကားပြော Movie Recap ဇာတ်လမ်းပြောဟန်အဖြစ် ပြန်လည်ဘာသာပြန် ရေးသားပေးပါ။

စည်းမျဉ်းသတ်မှတ်ချက်များ (အထူးလိုက်နာရန်):
၁။ မူရင်းဇာတ်လမ်း၏ အစ၊ အလယ်၊ အဆုံး ဖြစ်စဉ်တစ်ခုမျှ ကျော်မသွားစေဘဲ အကုန်အပြည့်အစုံ ပါဝင်စေရမည်။
၂။ မူရင်းတွင်မပါသော အကြောင်းအရာများကို မိမိသဘောဖြင့် မထည့်သွင်းရပါ။
၃။ မြန်မာ Movie Recap ချန်နယ်များတွင် နားဆင်ရလေ့ရှိသော သဘာဝကျသည့် စကားပြောဟန် (ဥပမာ- "ဒီဇာတ်လမ်းမှာတော့...", "အဲ့ဒီနောက်...", "သူကတော့...") ဖြင့် ချောမွေ့စွာ ရေးသားပါ။
၄။ ဇာတ်ကောင်အမည်များ၊ နေရာဒေသများ၊ အရေးကြီးသော လှည့်ကွက်နှင့် ဇာတ်လမ်းအလှည့်အပြောင်းများကို တိကျစွာ ထိန်းသိမ်းပါ။
၅။ မြန်မာစာလုံးပေါင်း သတ်ပုံ၊ ပုဒ်ဖြတ်ပုဒ်ရပ် (။ နှင့် ၊) မှန်ကန်စွာ သုံးစွဲပါ။
၆။ အင်္ဂလိပ်စာလုံးများ သို့မဟုတ် ရှင်းလင်းချက် ခေါင်းစဉ်များ မပါရှိစေဘဲ စကားပြောဖတ်ကြားမည့် မြန်မာစာသား သီးသန့်ကိုသာ တိုက်ရိုက်ထုတ်ပေးပါ။

မူရင်းအသံဖိုင် စာသားမှတ်တမ်း:
${fullOriginalTranscribe || 'No audible speech detected'}
`;

    const recapResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: recapPrompt,
    });

    const myanmarTranscript = (recapResponse.text || '').trim();

    // Clean up temporary video and chunk files
    try {
      fs.unlinkSync(videoPath);
      fs.unlinkSync(audioWavPath);
      chunkPaths.forEach((cp) => { try { fs.unlinkSync(cp); } catch {} });
    } catch {}

    res.json({
      success: true,
      transcript: myanmarTranscript || 'ဗီဒီယိုတွင် စကားပြောအသံ မတွေ့ရှိခဲ့ပါ။ စာသားကို မိမိစိတ်ကြိုက် ဖြည့်စွက်ရေးသားနိုင်ပါသည်။',
      originalTranscription: fullOriginalTranscribe,
      durationSeconds,
    });
  } catch (err: any) {
    console.error('Error processing video:', err);
    // Cleanup files on error
    try {
      if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      if (fs.existsSync(audioWavPath)) fs.unlinkSync(audioWavPath);
      chunkPaths.forEach((cp) => { try { fs.unlinkSync(cp); } catch {} });
    } catch {}

    res.status(500).json({
      error: err.message === 'INVALID_FORMAT'
        ? 'ဗီဒီယို ဖိုင်အမျိုးအစား မမှန်ကန်ပါ (MP4, MOV, WebM သာ လက်ခံပါသည်)'
        : err.message === 'GEMINI_API_KEY_MISSING'
        ? 'GEMINI_API_KEY မရှိသေးပါ။ AI Studio Secrets တွင် ထည့်သွင်းပေးပါ။'
        : `ဗီဒီယို စိစစ်ဖော်ထုတ်ခြင်း မအောင်မြင်ပါ: ${err.message || 'အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်'}`,
    });
  }
});

// Helper: Split Myanmar text into manageable chunks for TTS (preserving sentences up to 1200 characters)
function splitMyanmarTextIntoChunks(text: string, maxChunkLength = 1200): string[] {
  // Normalize whitespace
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  // Split by sentence ender "။" or newlines
  const sentences = clean.split(/(?<=[။\n])/g);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length <= maxChunkLength) {
      currentChunk += (currentChunk ? ' ' : '') + trimmed;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If a single sentence is longer than maxChunkLength, split by commas "၊"
      if (trimmed.length > maxChunkLength) {
        const subParts = trimmed.split(/(?<=[၊])/g);
        for (const sub of subParts) {
          const subTrimmed = sub.trim();
          if (currentChunk.length + subTrimmed.length <= maxChunkLength) {
            currentChunk += (currentChunk ? ' ' : '') + subTrimmed;
          } else {
            if (currentChunk) chunks.push(currentChunk);
            currentChunk = subTrimmed;
          }
        }
      } else {
        currentChunk = trimmed;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// In-memory store for generated audio sessions
const audioSessions = new Map<string, { mp3Path: string; wavPath: string; duration: number; voiceName: string; speed: number; createdAt: number }>();

// Clean up old audio sessions after 2 hours
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of audioSessions.entries()) {
    if (now - session.createdAt > 2 * 60 * 60 * 1000) {
      try {
        if (fs.existsSync(session.mp3Path)) fs.unlinkSync(session.mp3Path);
        if (fs.existsSync(session.wavPath)) fs.unlinkSync(session.wavPath);
      } catch {}
      audioSessions.delete(id);
    }
  }
}, 10 * 60 * 1000);

// API: Generate Complete Myanmar Voice-over
app.post('/api/generate-voiceover', async (req, res) => {
  const { transcript, voiceName = 'Puck', speed = 1.0 } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'အသံထွက်ဖတ်ကြားရန် မြန်မာစာသား ထည့်သွင်းပေးပါ' });
  }

  const voice = MYANMAR_TTS_VOICES.find((v) => v.id.toLowerCase() === (voiceName || '').toLowerCase()) || MYANMAR_TTS_VOICES[0];
  const numSpeed = Math.max(0.75, Math.min(1.5, parseFloat(speed) || 1.0));

  const sessionId = `recap-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const sessionDir = path.join(TEMP_DIR, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const ai = getGeminiClient();
    const textChunks = splitMyanmarTextIntoChunks(transcript, 1200);

    if (textChunks.length === 0) {
      return res.status(400).json({ error: 'ခွဲခြမ်းရန် စာသား မတွေ့ရှိပါ' });
    }

    const chunkFiles: string[] = [];

    // Generate audio for each chunk in chronological sequence using multi-model fallback
    for (let i = 0; i < textChunks.length; i++) {
      const chunkText = textChunks[i];
      const chunkWavFile = path.join(sessionDir, `chunk_${String(i).padStart(4, '0')}.wav`);

      let base64Audio = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          base64Audio = await generateTTSAudio(ai, chunkText, voice.id);
          if (base64Audio) break;
        } catch (ttsErr: any) {
          console.warn(`TTS attempt ${attempt + 1} failed for chunk ${i}:`, ttsErr?.message || ttsErr);
          if (attempt === 1) throw ttsErr;
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      if (!base64Audio) {
        throw new Error(`စာသားအပိုင်း (${i + 1}/${textChunks.length}) အတွက် အသံဖိုင် ဖန်တီး၍ မရရှိပါ`);
      }

      fs.writeFileSync(chunkWavFile, Buffer.from(base64Audio, 'base64'));
      chunkFiles.push(chunkWavFile);
    }

    // Create FFmpeg concat list
    const listFile = path.join(sessionDir, 'list.txt');
    const listContent = chunkFiles.map((f) => `file '${f}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    const finalMp3 = path.join(sessionDir, 'final.mp3');
    const finalWav = path.join(sessionDir, 'final.wav');

    // Combine audio chunks and apply speed adjustment filter
    const speedFilter = Math.abs(numSpeed - 1.0) > 0.01 ? `-filter:a "atempo=${numSpeed}"` : '';
    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${speedFilter} -c:a libmp3lame -q:a 2 "${finalMp3}"`);
    await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" ${speedFilter} -c:a pcm_s16le "${finalWav}"`);

    // Determine final duration
    let durationSeconds = 0;
    try {
      const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMp3}"`);
      durationSeconds = parseFloat(stdout.trim()) || 0;
    } catch {}

    // Store in sessions
    audioSessions.set(sessionId, {
      mp3Path: finalMp3,
      wavPath: finalWav,
      duration: durationSeconds,
      voiceName: voice.name,
      speed: numSpeed,
      createdAt: Date.now(),
    });

    // Provide initial base64 preview or streaming endpoint
    const mp3Buffer = fs.readFileSync(finalMp3);
    const audioBase64 = mp3Buffer.toString('base64');

    res.json({
      success: true,
      sessionId,
      downloadUrl: `/api/download/${sessionId}?format=mp3`,
      downloadWavUrl: `/api/download/${sessionId}?format=wav`,
      streamUrl: `/api/stream/${sessionId}`,
      audioBase64,
      duration: durationSeconds,
      voiceName: voice.name,
      speed: numSpeed,
      chunkCount: textChunks.length,
    });
  } catch (err: any) {
    console.error('Error generating final voiceover:', err);
    const isQuota = err?.status === 'RESOURCE_EXHAUSTED' || (err?.message && (err.message.includes('429') || err.message.includes('Quota exceeded')));
    res.status(500).json({
      error: isQuota
        ? 'Google Gemini TTS API အခမဲ့ Quota (Daily Free Tier Limit) ပြည့်သွားပါပြီ။ ကျေးဇူးပြု၍ ခဏစောင့်ဆိုင်းပြီးမှ ထပ်မံကြိုးစားပေးပါ သို့မဟုတ် AI Studio Settings > Secrets တွင် Paid API Key ပြောင်းလဲအသုံးပြုနိုင်ပါသည်။'
        : err.message === 'GEMINI_API_KEY_MISSING'
        ? 'GEMINI_API_KEY မရှိသေးပါ။ AI Studio Secrets တွင် သတ်မှတ်ပေးပါ။'
        : `မြန်မာအသံ ဖန်တီးရာတွင် အမှားဖြစ်ပေါ်ခဲ့သည်: ${err.message || 'အမှားတစ်ခု ဖြစ်ပေါ်ခဲ့သည်'}`,
    });
  }
});

// API: Stream audio for playback with disk fallback
app.get('/api/stream/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  let session = audioSessions.get(sessionId);
  let filePath = session ? session.mp3Path : null;

  // Fallback to disk check
  if (!filePath || !fs.existsSync(filePath)) {
    const diskPath = path.join(TEMP_DIR, sessionId, 'final.mp3');
    if (fs.existsSync(diskPath)) {
      filePath = diskPath;
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'အသံဖိုင် မတွေ့ရှိပါ သို့မဟုတ် သက်တမ်းကုန်ဆုံးသွားပါပြီ' });
  }

  const stat = fs.statSync(filePath);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Accept-Ranges', 'bytes');
  fs.createReadStream(filePath).pipe(res);
});

// API: Download Audio File with meaningful Myanmar Movie Recap filename
app.get('/api/download/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const format = req.query.format === 'wav' ? 'wav' : 'mp3';
  let session = audioSessions.get(sessionId);
  let filePath = session ? (format === 'wav' ? session.wavPath : session.mp3Path) : null;

  // Fallback to disk check
  if (!filePath || !fs.existsSync(filePath)) {
    const diskPath = path.join(TEMP_DIR, sessionId, format === 'wav' ? 'final.wav' : 'final.mp3');
    if (fs.existsSync(diskPath)) {
      filePath = diskPath;
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'ဒေါင်းလုဒ်လုပ်ရန် အသံဖိုင် မတွေ့ရှိပါ' });
  }

  const filename = `arrpay_recap_myanmar_voiceover.${format}`;
  const stat = fs.statSync(filePath);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', format === 'wav' ? 'audio/wav' : 'audio/mpeg');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'no-cache');
  fs.createReadStream(filePath).pipe(res);
});

// API: Get raw base64 audio data for resilient client-side saving
app.get('/api/audio-data/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const format = req.query.format === 'wav' ? 'wav' : 'mp3';
  const diskPath = path.join(TEMP_DIR, sessionId, format === 'wav' ? 'final.wav' : 'final.mp3');

  if (!fs.existsSync(diskPath)) {
    return res.status(404).json({ error: 'အသံဖိုင် မတွေ့ရှိပါ' });
  }

  const buffer = fs.readFileSync(diskPath);
  res.json({
    success: true,
    audioBase64: buffer.toString('base64'),
    mimeType: format === 'wav' ? 'audio/wav' : 'audio/mpeg',
    filename: `arrpay_recap_myanmar_voiceover.${format}`,
  });
});

// API: Reset session and clean temp files
app.post('/api/reset-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessionId && audioSessions.has(sessionId)) {
    const session = audioSessions.get(sessionId)!;
    try {
      if (fs.existsSync(session.mp3Path)) fs.unlinkSync(session.mp3Path);
      if (fs.existsSync(session.wavPath)) fs.unlinkSync(session.wavPath);
      const sessionDir = path.dirname(session.mp3Path);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch {}
    audioSessions.delete(sessionId);
  }
  res.json({ success: true });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`ARRPAY RECAP server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
