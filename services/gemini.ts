
import { GoogleGenAI, Modality } from "@google/genai";
import { TileData, Vocabulary } from '../types';

const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key-for-build' });

// --- Audio Caching & Context Management ---

// Cache for generated audio buffers to allow instant playback of repeated phrases
// Key format: "VoiceName:TextContent"
const audioCache = new Map<string, AudioBuffer>();
let audioContext: AudioContext | null = null;

// Helper for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize or get the shared AudioContext
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  // Ensure context is running (it can be suspended by browsers if created without user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(e => console.error("Failed to resume audio context:", e));
  }
  return audioContext;
};

// --- Text To Speech Core ---

/**
 * Generates audio for the given text and voice, caching the result.
 * Does NOT play the audio.
 * Includes Retry Logic for robustness.
 */
export const generateAudio = async (text: string, voiceName: string): Promise<AudioBuffer> => {
  const ctx = getAudioContext();
  
  // Normalize text: Convert all-caps (e.g. "HORSE") to Sentence case (e.g. "Horse").
  // This prevents Gemini 500 Internal Errors often caused by all-caps inputs.
  let textToSpeak = text;
  if (text && text.length > 1 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    textToSpeak = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  const cacheKey = `${voiceName}:${textToSpeak}`;

  // 1. Return cached if available
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey)!;
  }

  const MAX_RETRIES = 3;
  let lastError: any;

  // 2. Try Fetching from API with Retries
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
          },
          // Force the model to act strictly as a TTS engine to avoid "OTHER" finish reasons on short words
          systemInstruction: "You are a Text-to-Speech system. Your only task is to generate audio for the provided text. Do not generate text responses, even for conversational words like 'OK' or 'Please'.",
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        // Check for text response or finish reason for debugging
        const textResponse = response.candidates?.[0]?.content?.parts?.[0]?.text;
        const finishReason = response.candidates?.[0]?.finishReason;
        
        if (textResponse) {
          console.warn(`TTS returned text instead of audio for "${textToSpeak}": ${textResponse}`);
        }
        
        throw new Error(`No audio data returned. FinishReason: ${finishReason || 'Unknown'}`);
      }

      // 3. Decode
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        ctx,
        24000,
        1
      );
      
      // 4. Cache
      audioCache.set(cacheKey, audioBuffer);
      return audioBuffer;

    } catch (error) {
      lastError = error;
      // Only wait if we are going to try again
      if (attempt < MAX_RETRIES - 1) {
        // Faster Exponential-ish backoff: 200ms, 400ms... to speed up bulk downloads
        const waitTime = 200 * (attempt + 1);
        if (attempt > 0) console.warn(`TTS Attempt ${attempt + 1} failed for "${textToSpeak}". Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      }
    }
  }

  // Fallback for generic 500 errors on complex phrases - try removing punctuation
  if (textToSpeak.match(/[.?!]/)) {
     try {
       console.log(`Retrying without punctuation for: ${textToSpeak}`);
       const simpleText = textToSpeak.replace(/[.?!,]/g, "");
       return await generateAudio(simpleText, voiceName);
     } catch (fallbackError) {
       console.error("Fallback failed", fallbackError);
     }
  }

  console.error(`TTS Final Generation Error for "${textToSpeak}":`, lastError);
  throw lastError;
};

/**
 * Plays the provided AudioBuffer.
 */
const playAudioBuffer = (buffer: AudioBuffer) => {
  const ctx = getAudioContext();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
};

/**
 * High-level function to Speak text. 
 * Handles generation (or cache retrieval) and playback.
 */
export const speakText = async (text: string, voiceName: string = 'Fenrir'): Promise<void> => {
  try {
    const audioBuffer = await generateAudio(text, voiceName);
    playAudioBuffer(audioBuffer);
  } catch (error) {
    console.error("TTS Playback Error:", error);
    // Fallback to browser TTS if Gemini fails completely
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }
};

// --- Bulk Preloading ---

/**
 * Preloads audio for an entire vocabulary list.
 * @param vocabulary The full vocabulary object
 * @param voiceName The voice to generate
 * @param onProgress Callback (completed, total)
 */
export const preloadAudioAssets = async (
  vocabulary: Vocabulary, 
  voiceName: string, 
  onProgress: (completed: number, total: number) => void
) => {
  // 1. Extract all unique texts
  const uniqueTexts = new Set<string>();
  
  Object.values(vocabulary).forEach(categoryTiles => {
    categoryTiles.forEach(tile => {
      // Ignore folders or special tiles that might not have speech
      if (tile.id.startsWith('folder_')) return;
      uniqueTexts.add(tile.textToSpeak || tile.label);
    });
  });

  const textsToProcess = Array.from(uniqueTexts);
  const total = textsToProcess.length;
  let completed = 0;

  // 2. Filter out already cached items to report instant progress
  const queue = textsToProcess.filter(text => {
    // We need to check against the normalized cache key
    let normalized = text;
    if (text && text.length > 1 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
      normalized = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }
    const key = `${voiceName}:${normalized}`;
    if (audioCache.has(key)) {
      completed++;
      return false;
    }
    return true;
  });

  // Report initial progress (cached items)
  onProgress(completed, total);

  if (queue.length === 0) return;

  // 3. Process queue with HIGH concurrency for speed
  const BATCH_SIZE = 15; 
  
  for (let i = 0; i < queue.length; i += BATCH_SIZE) {
    const batch = queue.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (text) => {
      try {
        await generateAudio(text, voiceName);
      } catch (e) {
        console.warn(`Failed to preload "${text}"`, e);
      } finally {
        completed++;
        onProgress(completed, total);
      }
    }));
    
    // Tiny delay to allow event loop to breathe and prevent lockup
    await delay(20);
  }
};


// --- Content Generation & Analysis ---

export const generateTileImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string> => {
  // Helper to make the actual API call
  const attemptGeneration = async (model: string, useSizeConfig: boolean) => {
    const config: any = {
      imageConfig: {
        aspectRatio: '1:1',
      },
    };
    
    if (useSizeConfig) {
      config.imageConfig.imageSize = size;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [{ text: `A simple, clear, high-contrast icon-style illustration of: ${prompt}. White background, minimalist vector art style, suitable for an AAC communication board for accessibility.` }],
      },
      config: config,
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
         return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  };

  try {
    // 1. Try High Quality Model
    return await attemptGeneration('gemini-3-pro-image-preview', true);
  } catch (error: any) {
    // 2. Fallback to Flash Image if Permission Denied (403) or Not Found (404)
    // Check various error shapes from the library
    const status = error.status || error.response?.status || error.code;
    const msg = (error.message || '').toLowerCase();

    if (status === 403 || status === 404 || msg.includes('permission') || msg.includes('not found') || msg.includes('403')) {
      console.warn("High-quality image generation failed (permission/not found). Falling back to standard model.");
      try {
        return await attemptGeneration('gemini-2.5-flash-image', false);
      } catch (fallbackError) {
        console.error("Fallback Image Generation also failed:", fallbackError);
        throw fallbackError;
      }
    }
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const refineSentence = async (words: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: {
        parts: [{ text: `You are an assistive communication aide. Convert the following sequence of keywords into a grammatically correct, natural-sounding English sentence. Do not add unnecessary information, just fix the grammar. \n\nKeywords: "${words}"` }],
      },
    });
    return response.text || words;
  } catch (error) {
    console.error("Refine Text Error:", error);
    return words; // Fallback to original
  }
};

// --- Live API Helpers ---

// Helper to decode base64 to byte array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode raw PCM to AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper to encode Uint8Array to base64
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to create PCM blob
export function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to convert Blob to Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove data URL scheme prefix (e.g., "data:image/jpeg;base64,")
      resolve(base64data.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const getGeminiClient = () => ai;
