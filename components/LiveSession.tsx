import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getGeminiClient, createPcmBlob, blobToBase64 } from '../services/gemini';
import { LiveServerMessage, Modality } from '@google/genai';
import { Mic, Video, VideoOff, PhoneOff, User, MessageCircle } from 'lucide-react';

interface LiveSessionProps {
  onClose: () => void;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is speaking

  // Audio Contexts
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Video Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const cleanupRef = useRef<() => void>(() => {});

  // Helper: Decode Audio Data (Duplicated from service to keep component self-contained for audio processing flow)
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
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
  };

  const startSession = useCallback(async () => {
    try {
      setError(null);
      const ai = getGeminiClient();

      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      // Connect to Live API
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `
            You are a helpful and empathetic companion for a mute individual. 
            They cannot speak, but they can hear you. 
            Act as their voice and friend. 
            If you see the camera feed, describe what you see or answer questions about it.
            Keep responses concise and supportive.
          `,
        },
        callbacks: {
          onopen: async () => {
            console.log('Session Opened');
            setIsConnected(true);

            // Start Mic Stream
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              if (inputAudioContextRef.current) {
                const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                
                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                  const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                  const pcmBlob = createPcmBlob(inputData);
                  
                  if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                       session.sendRealtimeInput({ media: pcmBlob });
                    });
                  }
                };

                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContextRef.current.destination);
                
                // Save cleanup for mic
                const prevCleanup = cleanupRef.current;
                cleanupRef.current = () => {
                   prevCleanup();
                   stream.getTracks().forEach(track => track.stop());
                   scriptProcessor.disconnect();
                   source.disconnect();
                }
              }
            } catch (err) {
              console.error("Mic Error", err);
              setError("Could not access microphone.");
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              setIsSpeaking(true);
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                ctx,
                24000,
                1
              );
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsSpeaking(false);
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Interruption handling
            if (message.serverContent?.interrupted) {
               sourcesRef.current.forEach(src => src.stop());
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setIsSpeaking(false);
            }
          },
          onclose: () => {
            setIsConnected(false);
            console.log('Session Closed');
          },
          onerror: (err) => {
            console.error(err);
            setError("Connection error occurred.");
            setIsConnected(false);
          }
        }
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to start session.");
    }
  }, []);

  useEffect(() => {
    startSession();
    return () => {
      // Cleanup on unmount
      cleanupRef.current();
      // Close session context
      if (inputAudioContextRef.current) inputAudioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Video Streaming Logic
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsVideoEnabled(true);

        const ctx = canvasRef.current?.getContext('2d');
        if (canvasRef.current && ctx && videoRef.current) {
           frameIntervalRef.current = window.setInterval(() => {
             if (videoRef.current && canvasRef.current && sessionPromiseRef.current) {
               canvasRef.current.width = videoRef.current.videoWidth;
               canvasRef.current.height = videoRef.current.videoHeight;
               ctx.drawImage(videoRef.current, 0, 0);
               canvasRef.current.toBlob(async (blob) => {
                 if (blob) {
                   const base64Data = await blobToBase64(blob);
                   sessionPromiseRef.current?.then(session => {
                      session.sendRealtimeInput({
                        media: { data: base64Data, mimeType: 'image/jpeg' }
                      });
                   });
                 }
               }, 'image/jpeg', 0.5);
             }
           }, 1000); // 1 FPS for efficiency
        }
      }
    } catch (e) {
      console.error(e);
      setError("Could not access camera.");
    }
  };

  const stopVideo = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoEnabled(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-xl overflow-hidden relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="font-semibold text-sm tracking-wide">
             {isConnected ? 'Gemini Live Active' : 'Connecting...'}
          </span>
        </div>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 backdrop-blur-md">
          <PhoneOff size={20} className="text-red-400" />
        </button>
      </div>

      {/* Main Visual Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-800">
        
        {/* Video Background */}
        <video 
           ref={videoRef} 
           className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isVideoEnabled ? 'opacity-100' : 'opacity-0'}`} 
           muted 
           playsInline
        />
        
        {/* Helper Canvas for Frame Capture (Hidden) */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Avatar / Visualizer (Visible when no video or as overlay) */}
        <div className={`z-10 flex flex-col items-center justify-center transition-all duration-300 ${isVideoEnabled ? 'scale-75 translate-y-24 bg-black/40 p-6 rounded-3xl backdrop-blur-md' : 'scale-100'}`}>
           <div className={`relative flex items-center justify-center w-32 h-32 rounded-full border-4 transition-colors duration-300 ${isSpeaking ? 'border-blue-400 bg-blue-500/20' : 'border-slate-600 bg-slate-700/50'}`}>
              <div className={`absolute inset-0 rounded-full bg-blue-400 opacity-20 ${isSpeaking ? 'animate-ping' : ''}`}></div>
              {isSpeaking ? <MessageCircle size={48} className="text-blue-300" /> : <User size={48} className="text-slate-400" />}
           </div>
           <p className="mt-6 text-slate-300 font-medium text-center max-w-xs">
             {isSpeaking ? "Gemini is speaking..." : "Listening..."}
           </p>
        </div>

        {error && (
          <div className="absolute bottom-32 px-4 py-2 bg-red-500/90 text-white rounded-lg text-sm font-medium z-20">
            {error}
          </div>
        )}

      </div>

      {/* Controls */}
      <div className="h-24 bg-slate-950 flex items-center justify-center gap-6 z-20 border-t border-slate-800">
         <button 
           className={`p-4 rounded-full transition-all ${isVideoEnabled ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
           onClick={isVideoEnabled ? stopVideo : startVideo}
         >
           {isVideoEnabled ? <VideoOff size={24} /> : <Video size={24} />}
         </button>
         
         <div className="w-[1px] h-8 bg-slate-800" />
         
         <div className="flex flex-col items-center">
            <div className="bg-slate-800 p-3 rounded-full mb-1">
              <Mic size={24} className="text-green-400" />
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Mic On</span>
         </div>
      </div>
    </div>
  );
};

export default LiveSession;
