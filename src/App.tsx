// ============================================================================
// API HELPER FUNCTIONS - Ollama Based
// ============================================================================

// Chat with Ollama LLM
async function askOllama(prompt: string, lat?: number, lng?: number) {
  const res = await fetch('/api/chat-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, lat, lng })
  });
  const data = await res.json();
  return data;
}

// Search nearby facilities
async function searchFacilities(lat: number, lng: number, query: string) {
  const res = await fetch('/api/search-facilities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng, query })
  });
  const data = await res.json();
  return data.facilities || [];
}

// Detect language from text
async function detectLanguage(text: string): Promise<string> {
  try {
    const res = await fetch('/api/detect-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    return data.result || 'en';
  } catch (err) {
    return 'en';
  }
}

// Extract text from image using OCR
async function ocrImage(base64Image: string): Promise<string> {
  try {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image })
    });
    const data = await res.json();
    return data.result || '';
  } catch (err) {
    return '';
  }
}

// Translate text
async function translateText(text: string, src: string, tgt: string): Promise<string> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, src, tgt })
    });
    const data = await res.json();
    return data.result || text;
  } catch (err) {
    return text;
  }
}

// Text-to-Speech in Native Language
// Helper function to clean repetitive text
function cleanText(text: string): string {
  let cleaned = text;
  
  // Remove repeated words (e.g., "heyhey" -> "hey", "hi hi hi" -> "hi")
  cleaned = cleaned.replace(/(\b\w+)\s+\1+\b/gi, '$1');
  
  // Remove consecutive repeated characters in words (e.g., "heeyy" -> "hey")
  cleaned = cleaned.replace(/(\w)\1{2,}/g, '$1');
  
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  return cleaned.trim();
}

async function speakText(text: string, language: string = 'en') {
  try {
    // Clean text to remove repetitions before speaking
    const cleanedText = cleanText(text);
    
    // Web Speech API for text-to-speech
    const synth = window.speechSynthesis;
    
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    
    // Map language codes to speech synthesis language codes
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'bn': 'bn-IN',
      'gu': 'gu-IN',
      'pa': 'pa-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'or': 'or-IN',
      'si': 'si-LK',
      'mr': 'mr-IN'
    };
    
    utterance.lang = langMap[language] || 'en-US';
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    synth.speak(utterance);
    
    return new Promise((resolve) => {
      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error("Text-to-speech error:", err);
    return false;
  }
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Upload, MapPin, Activity, Loader2, FileText, Camera, Image as ImageIcon, X, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';

// Web Speech API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// ...existing code...

type AppState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  hospitals?: { name: string; uri: string }[];
  file?: { data: string; mimeType: string; url: string; name: string };
  detectedLanguage?: string;
  isSpeaking?: boolean;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US'); // Language selector for voice input
  // Facilities state (replaces hospital list)
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUploadMenu && !(event.target as Element).closest('.upload-menu-container')) {
        setShowUploadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUploadMenu]);

  // Get user location - IMPORTANT for hospital search
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          console.log("✅ Location detected:", loc);
        },
        (err) => {
          console.error("❌ Location error:", err.message);
          console.warn("⚠️ Without location, hospital search won't work. Please allow location access.");
          setLocation(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.error("❌ Geolocation is not supported by this browser");
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, appState]);

  const getFriendlyErrorMessage = (err: any): string => {
    console.error("Detailed API Error:", err);
    
    // Check for network issues
    if (!navigator.onLine) {
      return "You appear to be offline. Please check your internet connection and try again.";
    }

    let message = "";
    let code = 0;

    // Extract message and code from various error formats
    if (err.message) message = err.message;
    if (err.status) code = err.status;
    if (err.error) {
      if (typeof err.error === 'string') message = err.error;
      else {
        if (err.error.message) message = err.error.message;
        if (err.error.code) code = err.error.code;
      }
    }

    const lowerMessage = message.toLowerCase();

    // 1. Ollama Connection Issues
    if (lowerMessage.includes('ollama') || lowerMessage.includes('localhost:11434') || lowerMessage.includes('cannot connect')) {
      return "Cannot connect to Ollama server. Please make sure Ollama is running on http://localhost:11434";
    }

    // 2. Model Issues
    if (lowerMessage.includes('model') || code >= 500) {
      return "The AI service is temporarily unavailable. Please ensure the llama2 model is available in Ollama.";
    }

    // 3. Timeouts
    if (lowerMessage.includes('timeout') || lowerMessage.includes('deadline_exceeded')) {
      return "The request took too long to process. Please try a shorter query or check your connection.";
    }

    // 4. Network/Facility Search Issues  
    if (lowerMessage.includes('facility') || lowerMessage.includes('location')) {
      return "Could not find nearby facilities. Please enable location access or try again.";
    }

    // 5. Default Fallback
    return message || "An unexpected error occurred while processing your request. Please try again.";
  };

  const startRecording = async () => {
    // Use Web Speech API for continuous voice input
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech Recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false; // Only capture final results, not interim
      recognition.lang = selectedLanguage; // Use selected language (e.g., 'hi-IN', 'en-US', 'ta-IN')
      console.log("🎤 Starting voice recognition in language:", selectedLanguage);

      let finalTranscript = '';

      recognition.onstart = () => {
        setAppState('listening');
        finalTranscript = '';
      };

      recognition.onresult = (event: any) => {
        // Only process final results (not interim/partial)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          // Only add final results
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            console.log("Final recognized text:", transcript);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setAppState('idle');
        alert(`Speech recognition error: ${event.error}. Please try again.`);
      };

      recognition.onend = () => {
        const cleanedTranscript = finalTranscript.trim();
        if (cleanedTranscript) {
          console.log("Final transcribed text:", cleanedTranscript);
          processInteraction({ textPrompt: cleanedTranscript });
        } else {
          setAppState('idle');
          alert("No speech detected. Please try again and speak clearly.");
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Error starting speech recognition:", err);
      alert("Could not start speech recognition. Please check your microphone access.");
      setAppState('idle');
    }
  };

  const stopRecording = () => {
    // The Web Speech API handles its own stopping via onend event
    setAppState('idle');
  };

  const handleSpeak = async (messageId: string, text: string, language: string = 'en') => {
    // Update the message to show it's speaking
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isSpeaking: true } : msg
    ));
    
    await speakText(text, language);
    
    // Update the message to show it's done speaking
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, isSpeaking: false } : msg
    ));
  };

  const transcribeAudio = async (base64Audio: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Use Web Speech API for transcription (browser built-in)
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error("Speech Recognition API not available in this browser"));
        return;
      }

      // Since we have base64Audio from MediaRecorder, we'll use a fallback approach
      // Most modern browsers support continuous voice recognition, so we'll prompt user to repeat
      console.log("Base64 audio received, attempting transcription...");
      
      // For now, return instruction to use the microphone properly
      resolve("Please ensure your microphone is working and try again.");
    });
  };

  const processInteraction = async (input: { base64Audio?: string, audioMimeType?: string, textPrompt?: string, fileData?: any, skipUserMessageCreation?: boolean }) => {
    setAppState('processing');
    try {
      let userMessage = input.textPrompt || '[User input]';

      // If audio is provided, transcribe it first
      if (input.base64Audio && !input.textPrompt) {
        try {
          console.log("Transcribing audio from MediaRecorder...");
          userMessage = await transcribeAudio(input.base64Audio);
        } catch (err) {
          console.error("Transcription error:", err);
          userMessage = "Sorry, I couldn't understand the audio. Please try speaking again or type your symptoms.";
        }
      }

      // Add user message if needed
      if (!input.skipUserMessageCreation) {
        const userMsgId = Date.now().toString();
        setMessages(prev => ([
          ...prev,
          {
            id: userMsgId,
            role: 'user',
            text: userMessage
          }
        ]));
      }

      // Call chat endpoint with location
      const chatResponse = await askOllama(userMessage, location?.lat, location?.lng);
      
      let assistantText = chatResponse.result || "I'm here to help. Could you tell me more about how you're feeling?";
      
      // Add facility message to response if applicable
      if (chatResponse.facilityMessage && chatResponse.facilities?.length > 0) {
        assistantText += "\n\n" + chatResponse.facilityMessage;
        chatResponse.facilities.slice(0, 5).forEach((f: any) => {
          assistantText += `\n${f.name}`;
          if (f.phone) assistantText += ` - ${f.phone}`;
        });
      }

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: assistantText
      };

      // USE SERVER'S DETECTED LANGUAGE (more reliable than frontend detection)
      assistantMessage.detectedLanguage = chatResponse.detectedLanguage || 'en';
      console.log("Detected language from server:", assistantMessage.detectedLanguage);

      // Attach hospitals if facilities were suggested
      if (chatResponse.facilities && chatResponse.facilities.length > 0) {
        assistantMessage.hospitals = chatResponse.facilities.slice(0, 5).map((f: any) => ({
          name: f.name,
          uri: f.maps_url
        }));
      }

      setMessages(prev => ([
        ...prev,
        assistantMessage
      ]));

      // AUTO PLAY VOICE OUTPUT in detected language
      const langForSpeech = assistantMessage.detectedLanguage || 'en';
      console.log("Auto-playing voice in language:", langForSpeech);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI to update
      await handleSpeak(assistantMessage.id, assistantMessage.text, langForSpeech);

      setAppState('idle');
    } catch (err: any) {
      setAppState('idle');
      const friendlyMessage = getFriendlyErrorMessage(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        text: `Error: ${friendlyMessage}`
      }]);
    }
  };
  
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure permissions are granted.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) {
      console.error("Video reference is null. Cannot capture photo.");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];

        const fileData = {
          data: base64,
          mimeType: 'image/jpeg',
          name: `camera_capture_${Date.now()}.jpg`,
          url: dataUrl
        };

        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: userMsgId,
          role: 'user',
          text: `Uploaded report: ${fileData.name}`,
          file: fileData
        }]);

        setAppState('processing');
        try {
          const acknowledgeResponse = await askOllama("I have uploaded a medical report. Please acknowledge the upload and ask me what language I would like the explanation in. Keep it brief.", location?.lat, location?.lng);
          const acknowledgeText = acknowledgeResponse.result || acknowledgeResponse;
          processInteraction({
            textPrompt: acknowledgeText,
            fileData: fileData,
            skipUserMessageCreation: true
          });
        } catch (apiError) {
          console.error("Error calling askHuggingFace API:", apiError);
        }
      }
    } catch (err) {
      console.error("Error capturing photo:", err);
    } finally {
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.error("No file selected.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert("File is too large. Please upload a file smaller than 4MB.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAppState('processing');

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];

        let mimeType = file.type;
        if (!mimeType) {
          if (file.name.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else if (file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
          else if (file.name.toLowerCase().endsWith('.png')) mimeType = 'image/png';
          else mimeType = 'application/pdf';
        }

        const fileData = {
          data: base64,
          mimeType: mimeType,
          name: file.name,
          url: URL.createObjectURL(file)
        };

        const userMsgId = Date.now().toString();
        setMessages(prev => [...prev, {
          id: userMsgId,
          role: 'user',
          text: `Uploaded report: ${file.name}`,
          file: fileData
        }]);

        // OCR: extract text from image
        let extractedText = '';
        try {
          extractedText = await ocrImage(base64);
        } catch (ocrError) {
          console.error("Error during OCR:", ocrError);
          setMessages(prev => [...prev, {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            text: 'Could not extract text from the uploaded image. Please try a clearer photo.'
          }]);
          setAppState('idle');
          return;
        }

        // Language detection
        let detectedLang = 'en';
        try {
          detectedLang = await detectLanguage(extractedText);
        } catch (langError) {
          console.error("Error detecting language:", langError);
        }

        // If not English, translate to English for the LLM
        let textForLLM = extractedText;
        if (detectedLang !== 'en') {
          try {
            textForLLM = await translateText(extractedText, detectedLang, 'en');
          } catch (translateError) {
            console.error("Error translating text to English:", translateError);
          }
        }

        // Now, ask the LLM to explain the report in the user's language
        let explanation = '';
        try {
          const reportResponse = await askOllama(`Explain this medical report in simple terms for a patient, ask if they have any symptoms, and be conversational.\n\n${textForLLM}`, location?.lat, location?.lng);
          explanation = reportResponse.result || reportResponse;
        } catch (llmError) {
          console.error("Error generating explanation for the report:", llmError);
          setMessages(prev => [...prev, {
            id: (Date.now() + 3).toString(),
            role: 'assistant',
            text: 'Could not generate explanation for the report.'
          }]);
          setAppState('idle');
          return;
        }

        // If user's language is not English, translate explanation back
        let finalExplanation = explanation;
        if (detectedLang !== 'en') {
          try {
            finalExplanation = await translateText(explanation, 'en', detectedLang);
          } catch (translateBackError) {
            console.error("Error translating explanation back to user's language:", translateBackError);
          }
        }

        setMessages(prev => [...prev, {
          id: (Date.now() + 4).toString(),
          role: 'assistant',
          text: finalExplanation
        }]);
        setAppState('idle');
      } catch (err) {
        console.error("Error processing file upload:", err);
        setAppState('idle');
      }
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
  };

  return (
    <div className="h-screen relative flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 antialiased overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 pointer-events-none"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&q=80&w=2070")' }}
      />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-slate-900/40 via-slate-800/20 to-brand-900/30 pointer-events-none" />

      <header className="bg-white shadow-sm py-5 px-8 flex items-center justify-between sticky top-0 z-20 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-brand-600 to-brand-500 p-2 rounded-xl shadow-lg shadow-brand-500/20 ring-1 ring-white/30 animate-pulse-subtle">
            <Activity className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold text-black tracking-tight font-display">AarogyaVaani</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Language Selector for Voice Input */}
          <select 
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              console.log("🌐 Language changed to:", e.target.value);
            }}
            className="px-3 py-2 text-xs font-bold text-black bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
            title="Select language for voice input"
          >
            <option value="en-US">🇺🇸 English</option>
            <option value="hi-IN">🇮🇳 Hindi</option>
            <option value="ta-IN">🇮🇳 Tamil</option>
            <option value="te-IN">🇮🇳 Telugu</option>
            <option value="bn-IN">🇮🇳 Bengali</option>
            <option value="gu-IN">🇮🇳 Gujarati</option>
            <option value="pa-IN">🇮🇳 Punjabi</option>
            <option value="kn-IN">🇮🇳 Kannada</option>
            <option value="ml-IN">🇮🇳 Malayalam</option>
          </select>

          <div className="relative upload-menu-container">
            <button onClick={() => setShowUploadMenu(!showUploadMenu)} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-black bg-slate-50 rounded-full hover:bg-slate-100 hover:shadow-sm transition-all border border-slate-200 backdrop-blur-md">
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload Report</span>
            </button>
            
            {showUploadMenu && (
              <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50"
              >
                <button 
                  onClick={() => {
                    startCamera();
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <Camera className="w-4 h-4 text-brand-600" />
                  Take Photo
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left border-t border-slate-50"
                >
                  <ImageIcon className="w-4 h-4 text-brand-600" />
                  Choose from Gallery
                </button>
                <button 
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowUploadMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-700 transition-colors text-left border-t border-slate-50"
                >
                  <FileText className="w-4 h-4 text-brand-600" />
                  Upload Document
                </button>
              </motion.div>
            )}
          </div>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*,application/pdf" className="hidden" />
        <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-48 max-w-4xl mx-auto w-full scroll-smooth">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-6xl font-black text-brand-600 tracking-tight leading-tight font-display">
                How can I help you today?
              </h2>
              <p className="text-slate-700 max-w-md text-2xl leading-relaxed font-bold mx-auto tracking-tight">
                Tap to speak or describe your symptoms for instant health guidance.
              </p>
            </div>
          </div>
        )}

        {messages.map(msg => (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.file && (
              <div className="mb-2">
                {msg.file.mimeType.startsWith('image/') ? (
                  <img src={msg.file.url} alt="Uploaded report" className="max-w-[240px] rounded-2xl shadow-sm border border-slate-200/60 object-cover" />
                ) : (
                  <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/60 shadow-sm text-slate-700">
                    <div className="p-2 bg-brand-50 rounded-xl">
                      <FileText className="w-5 h-5 text-brand-600" />
                    </div>
                    <span className="text-sm font-medium truncate max-w-[150px]">{msg.file.name}</span>
                  </div>
                )}
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[80%] p-5 md:p-6 rounded-[2.5rem] shadow-sm ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-yellow-400 to-yellow-300 text-slate-900 rounded-tr-none shadow-xl shadow-yellow-400/40 ring-2 ring-yellow-500'
                : 'bg-white backdrop-blur-xl text-slate-900 border border-slate-200/60 shadow-2xl shadow-slate-300/50 rounded-tl-none ring-1 ring-slate-200/40'
            }`}>
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="whitespace-pre-wrap leading-relaxed text-[16px] font-medium tracking-tight flex-1">{msg.text}</p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleSpeak(msg.id, msg.text, msg.detectedLanguage)}
                      className="flex-shrink-0 p-2 rounded-full hover:bg-slate-100 transition-colors"
                      title="Listen to response"
                    >
                      {msg.isSpeaking ? (
                        <VolumeX className="w-5 h-5 text-red-500 animate-pulse" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-brand-600 hover:text-brand-700" />
                      )}
                    </button>
                  )}
                </div>
                {msg.hospitals && msg.hospitals.length > 0 && msg.role === 'assistant' && (
                  <div className="mt-5 space-y-2.5">
                    <div className="font-bold mb-2 text-slate-900">📍 Nearby Facilities:</div>
                    {msg.hospitals.map((h, idx) => (
                      <div key={idx} className="p-3 border rounded-xl bg-slate-50 flex flex-col mb-2 hover:bg-slate-100 transition">
                        <a href={h.uri} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">{h.name}</a>
                      </div>
                    ))}
                  </div>
                )}
              </>
            </div>
          </motion.div>
        ))}


        <div ref={messagesEndRef} />
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent flex justify-center pb-20 pointer-events-none">
        <div className="relative flex items-center justify-center pointer-events-auto">
          {messages.length > 0 && appState === 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-16 text-sm text-brand-700 font-bold bg-white/90 px-6 py-2.5 rounded-full shadow-xl border border-brand-100/50 backdrop-blur-md whitespace-nowrap ring-1 ring-brand-500/10"
            >
              Tap to ask a follow-up
            </motion.div>
          )}
          {appState === 'idle' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute inset-0 bg-brand-400 rounded-full blur-xl"
            />
          )}
          {appState === 'listening' && (
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-0 bg-red-400 rounded-full blur-xl"
            />
          )}
          {appState === 'speaking' && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute inset-0 bg-brand-400 rounded-full blur-xl"
            />
          )}

          <button
            onClick={appState === 'idle' || appState === 'speaking' ? startRecording : stopRecording}
            disabled={appState === 'processing'}
            className={`relative z-10 flex items-center justify-center w-24 h-24 rounded-[2.5rem] shadow-2xl transition-all duration-500 active:scale-95 ${
              appState === 'listening' ? 'bg-red-500 text-white scale-110 shadow-red-500/40 rotate-90' :
              appState === 'processing' ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
              appState === 'speaking' ? 'bg-gradient-to-tr from-red-500 to-red-400 text-white shadow-red-500/40 ring-4 ring-red-100' :
              'bg-gradient-to-tr from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 hover:scale-110 shadow-red-600/30 ring-4 ring-white/50'
            }`}
          >
            {appState === 'idle' && <Mic className="w-10 h-10" />}
            {appState === 'listening' && <Square className="w-10 h-10 fill-current" />}
            {appState === 'processing' && <Loader2 className="w-10 h-10 animate-spin" />}
            {appState === 'speaking' && <Activity className="w-10 h-10 animate-pulse" />}
          </button>
        </div>
      </div>

      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
            <button 
              onClick={stopCamera}
              className="p-4 bg-slate-800/50 text-white rounded-full backdrop-blur-sm hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <button 
              onClick={capturePhoto}
              className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <div className="w-16 h-16 bg-white rounded-full border-2 border-slate-800" />
            </button>
            <div className="w-14" />
          </div>
        </div>
      )}
    </div>
  );
}
