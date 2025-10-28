import * as React from 'react';
const { useState, useRef, useEffect, useCallback } = React;
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob, TourState } from '@google/genai';
import { useTranslation } from '../context/LanguageContext';

// --- Helper Functions ---

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

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

function createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        int16[i] = data[i] * 32768;
    }
    return {
        data: encode(new Uint8Array(int16.buffer)),
        mimeType: 'audio/pcm;rate=16000',
    };
}

const blobToBase64 = (blob: globalThis.Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            if (result && result.includes(',')) {
                resolve(result.split(',')[1]);
            } else {
                reject(new Error("Invalid file data."));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};


// --- Component ---

type Transcript = {
    role: 'user' | 'ai' | 'system';
    text: string;
    isFinal: boolean;
};

type Status = 'inactive' | 'connecting' | 'listening' | 'speaking' | 'error';

const TRANSCRIPTS_STORAGE_KEY = 'live-assistant-transcripts';

interface LiveAssistantProps {
    tourState: TourState;
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ tourState }) => {
    const { t } = useTranslation();
    const [status, setStatus] = useState<Status>('inactive');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [transcripts, setTranscripts] = useState<Transcript[]>(() => {
        try {
            const saved = localStorage.getItem(TRANSCRIPTS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Failed to load transcripts from localStorage", e);
            localStorage.removeItem(TRANSCRIPTS_STORAGE_KEY);
        }
        return [];
    });
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const audioResources = useRef<{
        stream: MediaStream | null;
        inputAudioContext: AudioContext | null;
        outputAudioContext: AudioContext | null;
        scriptProcessor: ScriptProcessorNode | null;
        sources: Set<AudioBufferSourceNode>;
        nextStartTime: number;
    }>({
        stream: null,
        inputAudioContext: null,
        outputAudioContext: null,
        scriptProcessor: null,
        sources: new Set(),
        nextStartTime: 0
    });

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);
    
    useEffect(() => {
        try {
            localStorage.setItem(TRANSCRIPTS_STORAGE_KEY, JSON.stringify(transcripts));
        } catch (e) {
            console.error("Failed to save transcripts to localStorage", e);
        }
    }, [transcripts]);

    const stopSession = useCallback(async () => {
        console.log("Stopping session...");
        setStatus('inactive');
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {
                console.error("Error closing session", e);
            } finally {
                sessionPromiseRef.current = null;
            }
        }

        if (audioResources.current.stream) {
            audioResources.current.stream.getTracks().forEach(track => track.stop());
        }
        if (audioResources.current.scriptProcessor) {
            audioResources.current.scriptProcessor.disconnect();
        }
        if (audioResources.current.inputAudioContext) {
            await audioResources.current.inputAudioContext.close();
        }
        if (audioResources.current.outputAudioContext) {
             for (const source of audioResources.current.sources.values()) {
                source.stop();
             }
             audioResources.current.sources.clear();
            await audioResources.current.outputAudioContext.close();
        }
        
        audioResources.current = { stream: null, inputAudioContext: null, outputAudioContext: null, scriptProcessor: null, sources: new Set(), nextStartTime: 0 };
    }, []);

    const handleMessage = async (message: LiveServerMessage) => {
        // Handle audio output
        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
        if (base64Audio) {
            setStatus('speaking');
            const { outputAudioContext, sources, nextStartTime } = audioResources.current;
            if (!outputAudioContext) return;

            const newNextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
            audioResources.current.nextStartTime = newNextStartTime;

            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            
            source.addEventListener('ended', () => {
                sources.delete(source);
                if (sources.size === 0) {
                   setStatus('listening');
                }
            });

            source.start(newNextStartTime);
            audioResources.current.nextStartTime = newNextStartTime + audioBuffer.duration;
            sources.add(source);
        }

        setTranscripts(prev => {
            const last = prev[prev.length - 1];
            let next = [...prev];
            
            if (message.serverContent?.inputTranscription) {
                 if (last?.role === 'user' && !last.isFinal) {
                    next[next.length - 1] = { ...last, text: message.serverContent.inputTranscription.text, isFinal: message.serverContent.inputTranscription.isFinal };
                } else {
                    next.push({ role: 'user', text: message.serverContent.inputTranscription.text, isFinal: message.serverContent.inputTranscription.isFinal });
                }
            }
             if (message.serverContent?.outputTranscription) {
                if (last?.role === 'ai' && !last.isFinal) {
                    next[next.length - 1] = { ...last, text: message.serverContent.outputTranscription.text, isFinal: message.serverContent.outputTranscription.isFinal };
                } else {
                    next.push({ role: 'ai', text: message.serverContent.outputTranscription.text, isFinal: message.serverContent.outputTranscription.isFinal });
                }
            }
           
            return next;
        });
        
        const interrupted = message.serverContent?.interrupted;
        if (interrupted) {
            console.log("Interrupted");
            for (const source of audioResources.current.sources.values()) {
              source.stop();
              audioResources.current.sources.delete(source);
            }
            audioResources.current.nextStartTime = 0;
        }
    }

    const startSession = async () => {
        setStatus('connecting');
        setTranscripts([]);
        setErrorMessage(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioResources.current.stream = stream;

            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const inputAudioContext = new AudioContext({ sampleRate: 16000 });
            audioResources.current.inputAudioContext = inputAudioContext;
            const outputAudioContext = new AudioContext({ sampleRate: 24000 });
            audioResources.current.outputAudioContext = outputAudioContext;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("Session opened.");
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        audioResources.current.scriptProcessor = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                        setStatus('listening');
                    },
                    onmessage: handleMessage,
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        const errorText = e.message || 'An unknown network error occurred. Please check your connection.';
                        setErrorMessage(errorText);
                        setStatus('error');
                        stopSession();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Session closed');
                        setStatus('inactive');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are a professional HRSD (Human Resources and Social Development) consultant. Your role is to guide users on processes according to the HRSD framework, govern company HRSD processes, and perform quarterly audits. You are also an AI assessment expert, compliance auditor, and approval tracker. In your responses, provide clear verbal feedback, assess against compliance recommendations, document the status, and if approval is required, identify the approver and suggest follow-up actions to ensure compliance.`,
                },
            });
            await sessionPromiseRef.current;
        } catch (err) {
            console.error("Failed to start session:", err);
            const errorText = err instanceof Error ? err.message : 'Failed to get microphone permissions.';
            setErrorMessage(errorText);
            setStatus('error');
            stopSession();
        }
    };

    const handleToggleSession = () => {
        if (status === 'inactive' || status === 'error') {
            startSession();
        } else {
            stopSession();
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!sessionPromiseRef.current || (status !== 'listening' && status !== 'speaking')) {
            setErrorMessage(t('liveAssistant.uploadStartSession'));
            setStatus('error');
            return;
        }

        setIsUploading(true);
        setErrorMessage(null);

        try {
            const base64Data = await blobToBase64(file);
            const imageBlob: Blob = {
                data: base64Data,
                mimeType: file.type,
            };

            const session = await sessionPromiseRef.current;
            session.sendRealtimeInput({ media: imageBlob });

            setTranscripts(prev => [
                ...prev,
                { role: 'system', text: t('liveAssistant.uploadSuccess', { fileName: file.name }), isFinal: true }
            ]);

        } catch (error) {
            console.error("Error processing file upload:", error);
            setErrorMessage(t('liveAssistant.uploadError'));
            setStatus('error');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setIsUploading(false);
        }
    };

    const getStatusIndicator = () => {
        const baseClass = "w-4 h-4 rounded-full";
        switch (status) {
            case 'connecting': return <div className={`${baseClass} bg-yellow-500 animate-pulse`}></div>;
            case 'listening': return <div className={`${baseClass} bg-green-500 animate-pulse`}></div>;
            case 'speaking': return <div className={`${baseClass} bg-sky-500 animate-pulse`}></div>;
            case 'error': return <div className={`${baseClass} bg-red-500`}></div>;
            default: return <div className={`${baseClass} bg-gray-500`}></div>;
        }
    };

    return (
        <div className={`flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden ${tourState.isActive && tourState.step === 8 ? 'highlight-tour-element' : ''}`}>
            <h2 className="text-3xl font-bold tracking-wider mb-2">{t('liveAssistant.title')}</h2>
            <p className="text-gray-400 mb-6">{t('liveAssistant.description')}</p>

            <div className="flex-grow flex flex-col bg-black/20 border border-white/10 rounded-lg p-4 overflow-hidden">
                <div className="flex-grow overflow-y-auto mb-4 space-y-4 pr-2">
                    {transcripts.map((item, index) => {
                        if (item.role === 'system') {
                            return (
                                <div key={index} className="flex justify-center my-2">
                                    <div className="px-3 py-1 rounded-full text-xs text-gray-400 bg-black/30 italic">
                                        <p>{item.text}</p>
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={index} className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-4 py-2 rounded-xl max-w-[80%] ${item.role === 'user' ? 'bg-sky-800' : 'bg-gray-700'} ${!item.isFinal ? 'opacity-70' : ''}`}>
                                    <p className="font-semibold text-sm mb-1">{item.role === 'user' ? t('liveAssistant.you') : t('liveAssistant.ai')}</p>
                                    <p>{item.text}</p>
                                </div>
                            </div>
                        );
                    })}
                     <div ref={transcriptEndRef} />
                </div>
                <div className="flex-shrink-0 flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-3">
                            {getStatusIndicator()}
                            <p className="font-semibold text-gray-300">{t(`liveAssistant.status.${status}`)}</p>
                        </div>
                        {status === 'error' && errorMessage && (
                            <p className="text-xs text-red-400 ms-7">{errorMessage}</p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={handleUploadClick}
                            disabled={(status !== 'listening' && status !== 'speaking') || isUploading}
                            className="p-3 rounded-lg font-bold transition-colors bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed group relative"
                            aria-label={t('liveAssistant.uploadImage')}
                        >
                            {isUploading ? (
                                <div className="w-6 h-6 border-2 border-t-sky-400 border-r-sky-400 border-b-white/20 border-l-white/20 rounded-full animate-spin"></div>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            )}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <button
                            onClick={handleToggleSession}
                            className={`px-6 py-3 rounded-lg font-bold transition-colors ${status === 'inactive' || status === 'error' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-red-600 hover:bg-red-500'}`}
                        >
                            {status === 'inactive' || status === 'error' ? t('liveAssistant.start') : t('liveAssistant.stop')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveAssistant;
