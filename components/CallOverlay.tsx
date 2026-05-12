
import React, { useEffect, useRef, useState } from 'react';
import { Profile, CallType } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { MicOff, Volume2, PhoneOff, Video as VideoIcon, User } from 'lucide-react';

interface CallOverlayProps {
  profile: Profile;
  type: CallType;
  onEnd: () => void;
}

// Helper functions for audio encoding/decoding
function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
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

function createBlob(data: Float32Array): any {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

const CallOverlay: React.FC<CallOverlayProps> = ({ profile, type, onEnd }) => {
  const [status, setStatus] = useState<'ringing' | 'connected'>('ringing');
  const [callDuration, setCallDuration] = useState(0);
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const ringTimeout = setTimeout(() => setStatus('connected'), 3000);
    const timer = setInterval(() => {
      if (status === 'connected') setCallDuration(d => d + 1);
    }, 1000);

    if (type === 'video' && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    }

    return () => {
      clearTimeout(ringTimeout);
      clearInterval(timer);
      sessionRef.current?.close();
      audioContextInRef.current?.close();
      audioContextOutRef.current?.close();
    };
  }, [status, type]);

  useEffect(() => {
    if (status === 'connected') {
      startLiveSession();
    }
  }, [status]);

  const startLiveSession = async () => {
    const api_key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!api_key) return;

    const ai = new GoogleGenAI({ apiKey: api_key });
    
    audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

    const sessionPromise = ai.live.connect({
      model: 'gemini-3.1-flash-live-preview',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
        systemInstruction: `You are ${profile.name} on a ${type} call. Be very sweet and romantic. Talk like a girlfriend from Bangladesh. Speak in Banglish. Ask the user how his day was and say you missed him.`,
      },
      callbacks: {
        onopen: async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => session.sendRealtimeInput({ audio: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          } catch (err) {
            console.error("Mic error:", err);
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          const audioBase64 = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64) {
            const ctx = audioContextOutRef.current!;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const buffer = await decodeAudioData(decode(audioBase64), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += buffer.duration;
            sourcesRef.current.add(source);
            source.onended = () => sourcesRef.current.delete(source);
          }
          if (message.serverContent?.interrupted) {
            sourcesRef.current.forEach(s => s.stop());
            sourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => console.error("Session error:", e),
        onclose: () => console.log("Session closed"),
      }
    });

    sessionRef.current = await sessionPromise;
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] flex flex-col items-center justify-between py-12 text-white">
      {type === 'video' && status === 'connected' && (
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute inset-0 bg-black">
              <img 
                src={profile.avatar} 
                className="w-full h-full object-cover opacity-40 blur-md transform scale-110" 
                alt="Partner Background"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                 <motion.img 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={profile.avatar} 
                  className="w-64 h-64 rounded-full border-4 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.5)] object-cover" 
                  alt="Partner"
                />
              </div>
           </div>
           {/* Self view */}
           <motion.video 
             drag
             dragConstraints={{ left: -300, right: 0, top: 0, bottom: 500 }}
             ref={videoRef} 
             autoPlay 
             muted 
             playsInline 
             className="absolute top-6 right-6 w-28 h-40 bg-black rounded-2xl border-2 border-white/20 object-cover shadow-2xl z-20 cursor-move"
           />
        </div>
      )}

      {type === 'audio' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-40 h-40 rounded-full border-4 border-white/10 shadow-2xl object-cover relative z-10"
            />
          </motion.div>
        </div>
      )}

      <div className="z-10 flex flex-col items-center mt-8">
        <h2 className="text-3xl font-bold mb-2 tracking-tight">{profile.name}</h2>
        <p className="text-blue-400 text-lg font-medium tracking-wide">
          {status === 'ringing' ? (
            <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
              Ringing...
            </motion.span>
          ) : formatTime(callDuration)}
        </p>
      </div>

      <div className="z-10 flex flex-col items-center gap-10 mb-8 w-full px-12">
        <div className="flex gap-12">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all shadow-lg"
          >
            <MicOff className="w-6 h-6" />
          </motion.button>
          {type === 'video' ? (
             <motion.button 
                whileTap={{ scale: 0.9 }}
                className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all shadow-lg"
              >
                <VideoIcon className="w-6 h-6" />
              </motion.button>
          ) : (
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/10 hover:bg-white/20 transition-all shadow-lg"
            >
              <Volume2 className="w-6 h-6" />
            </motion.button>
          )}
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onEnd}
          className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-all"
        >
          <PhoneOff className="w-10 h-10 transform scale-x-[-1]" />
        </motion.button>
      </div>
    </div>
  );
};

export default CallOverlay;
