import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ArrowLeft, 
  Volume2, 
  Gauge, 
  Play, 
  Square, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Languages, 
  Headphones, 
  Zap
} from 'lucide-react';
import { ContinuousTTSPlayer, TTSLanguage } from '../utils/textToSpeech';

interface TTSSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TTSSettingsModal: React.FC<TTSSettingsModalProps> = ({ isOpen, onClose }) => {
  // Speed setting
  const [speed, setSpeed] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ai_preferred_tts_speed');
      return saved ? parseFloat(saved) : 0.85;
    } catch {
      return 0.85;
    }
  });

  // Language setting: 'auto' | 'bn' | 'en'
  const [preferredLang, setPreferredLang] = useState<TTSLanguage>(() => {
    try {
      const saved = localStorage.getItem('ai_preferred_tts_lang');
      if (saved === 'bn' || saved === 'en' || saved === 'auto') {
        return saved;
      }
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  // Voice URI setting
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => {
    try {
      return localStorage.getItem('ai_preferred_tts_voice') || 'auto';
    } catch {
      return 'auto';
    }
  });

  // Engine mode setting: 'natural' | 'browser'
  const [preferredMode, setPreferredMode] = useState<'natural' | 'browser'>(() => {
    try {
      return (localStorage.getItem('ai_preferred_tts_mode') as 'natural' | 'browser') || 'natural';
    } catch {
      return 'natural';
    }
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const testPlayerRef = useRef<ContinuousTTSPlayer | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external updates (e.g., from quick selector inside ChatMessageItem)
  useEffect(() => {
    const syncSpeed = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number') setSpeed(detail);
    };
    const syncLang = (e: Event) => {
      const detail = (e as CustomEvent<TTSLanguage>).detail;
      if (detail === 'auto' || detail === 'bn' || detail === 'en') setPreferredLang(detail);
    };
    const syncVoice = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === 'string') setSelectedVoiceURI(detail);
    };
    window.addEventListener('tts-speed-changed', syncSpeed);
    window.addEventListener('tts-lang-changed', syncLang);
    window.addEventListener('tts-voice-changed', syncVoice);
    return () => {
      window.removeEventListener('tts-speed-changed', syncSpeed);
      window.removeEventListener('tts-lang-changed', syncLang);
      window.removeEventListener('tts-voice-changed', syncVoice);
    };
  }, []);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const v = window.speechSynthesis.getVoices() || [];
        if (v.length > 0) {
          setAvailableVoices(v);
        }
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Stop testing audio if modal is closed
  useEffect(() => {
    if (!isOpen) {
      handleStopTest();
    }
  }, [isOpen]);

  const bengaliVoices = availableVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('bn') ||
      v.name.toLowerCase().includes('bangla') ||
      v.name.toLowerCase().includes('bengali')
  );

  const englishVoices = availableVoices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('en') &&
      !bengaliVoices.some((b) => b.voiceURI === v.voiceURI)
  );

  const triggerSavedFeedback = () => {
    setSavedSuccess(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSpeedChange = (newSpeed: number) => {
    const clamped = Math.round(Math.max(0.5, Math.min(2.0, newSpeed)) * 100) / 100;
    setSpeed(clamped);
    testPlayerRef.current?.updateOptions({ speed: clamped });
    try {
      localStorage.setItem('ai_preferred_tts_speed', clamped.toString());
      window.dispatchEvent(new CustomEvent('tts-speed-changed', { detail: clamped }));
    } catch (_) {}
    triggerSavedFeedback();
  };

  const handleLanguageChange = (lang: TTSLanguage) => {
    setPreferredLang(lang);
    try {
      localStorage.setItem('ai_preferred_tts_lang', lang);
      window.dispatchEvent(new CustomEvent('tts-lang-changed', { detail: lang }));
    } catch (_) {}
    if (isTesting) {
      handleStopTest();
    }
    triggerSavedFeedback();
  };

  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoiceURI(voiceURI);
    try {
      localStorage.setItem('ai_preferred_tts_voice', voiceURI);
      window.dispatchEvent(new CustomEvent('tts-voice-changed', { detail: voiceURI }));
    } catch (_) {}
    triggerSavedFeedback();
  };

  const handleModeChange = (mode: 'natural' | 'browser') => {
    setPreferredMode(mode);
    try {
      localStorage.setItem('ai_preferred_tts_mode', mode);
      window.dispatchEvent(new CustomEvent('tts-mode-changed', { detail: mode }));
    } catch (_) {}
    triggerSavedFeedback();
  };

  const handleResetToDefault = () => {
    handleSpeedChange(0.85);
    handleLanguageChange('auto');
    handleVoiceChange('auto');
    handleModeChange('natural');
  };

  const sampleText =
    preferredLang === 'en'
      ? 'Hello! This is a voice speed and language test for reading your chat messages aloud cleanly.'
      : 'এটি বাংলা ও ইংরেজি পড়ার গতি পরীক্ষার নমুনা বাক্য। এই গতিতে সহকারী আপনার সব চ্যাট বার্তা পড়ে শোনাবে।';

  const handlePlayTest = () => {
    if (isTesting) {
      handleStopTest();
      return;
    }

    if (testPlayerRef.current) {
      testPlayerRef.current.stop();
    }

    testPlayerRef.current = new ContinuousTTSPlayer({
      speed,
      language: preferredLang,
      preferredMode,
      voiceURI: selectedVoiceURI,
      onStateChange: (speaking) => {
        setIsTesting(speaking);
      },
      onComplete: () => {
        setIsTesting(false);
      },
      onError: () => {
        setIsTesting(false);
      },
    });

    setIsTesting(true);
    testPlayerRef.current.play(sampleText, 0);
  };

  const handleStopTest = () => {
    if (testPlayerRef.current) {
      testPlayerRef.current.stop();
      testPlayerRef.current = null;
    }
    setIsTesting(false);
  };

  if (!isOpen) return null;

  const presets = [
    { value: 0.75, label: '0.75x', desc: 'ধীর ও শান্ত' },
    { value: 0.85, label: '0.85x', desc: 'প্রাকৃতিক (সুপারিশকৃত)', isRecommended: true },
    { value: 1.0, label: '1.0x', desc: 'স্বাভাবিক' },
    { value: 1.25, label: '1.25x', desc: 'দ্রুত' },
    { value: 1.5, label: '1.5x', desc: 'খুব দ্রুত' },
  ];

  const languageOptions: Array<{
    id: TTSLanguage;
    badge: string;
    title: string;
    desc: string;
  }> = [
    {
      id: 'auto',
      badge: 'AUTO',
      title: 'স্বয়ংক্রিয় (বাংলা + English)',
      desc: 'মেসেজের লেখা অনুযায়ী ভাষা নির্ধারণ',
    },
    {
      id: 'bn',
      badge: '🇧🇩 BN',
      title: 'বাংলা (Bengali)',
      desc: 'সবসময় বাংলা কণ্ঠস্বর ব্যবহার করবে',
    },
    {
      id: 'en',
      badge: '🌐 EN',
      title: 'ইংরেজি (English)',
      desc: 'সবসময় ইংরেজি কণ্ঠস্বর ব্যবহার করবে',
    },
  ];

  return (
    <div
      id="tts-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="tts-settings-modal-content"
        className="bg-white dark:bg-stone-900 border-t sm:border border-stone-200 dark:border-stone-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] text-stone-900 dark:text-stone-100 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tts-settings-modal-title"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/70 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="tts-settings-modal-title"
                  className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 truncate"
                >
                  Text-to-Speech (TTS) সেটিংস প্যানেল
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  ভয়েস কন্ট্রোল
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                চ্যাট মেসেজ জোরে পড়ার জন্য কণ্ঠস্বরের গতি ও ভাষা (বাংলা/ইংরেজি) নির্ধারণ করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-200/80 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition-all cursor-pointer shadow-xs border border-stone-300/60 dark:border-stone-700/60"
              title="চ্যাটে ফিরে যান (Back)"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ফিরে যান</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Section 1: Language Selection (বাংলা / ইংরেজি / স্বয়ংক্রিয়) */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  কণ্ঠস্বরের ভাষা (TTS Language)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-500/20">
                {preferredLang === 'bn'
                  ? 'বাংলা (bn-BD)'
                  : preferredLang === 'en'
                  ? 'English (en-US)'
                  : 'স্বয়ংক্রিয় (Auto)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {languageOptions.map((opt) => {
                const isSelected = preferredLang === opt.id;
                return (
                  <button
                    key={opt.id}
                    id={`tts-lang-option-${opt.id}`}
                    type="button"
                    onClick={() => handleLanguageChange(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                        }`}
                      >
                        {opt.badge}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-snug">{opt.title}</div>
                      <div
                        className={`text-[10px] mt-0.5 leading-tight ${
                          isSelected ? 'text-emerald-50/90' : 'text-stone-500 dark:text-stone-400'
                        }`}
                      >
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Reading Speed Slider & Gauge */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  কণ্ঠস্বরের গতি (Speech Speed)
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-sm border border-emerald-500/20">
                <span>{speed.toFixed(2)}x</span>
                {speed === 0.85 && (
                  <span className="text-[10px] font-sans font-normal text-emerald-600 dark:text-emerald-400">
                    (সুপারিশকৃত)
                  </span>
                )}
              </div>
            </div>

            {/* Slider Control */}
            <div className="space-y-2">
              <input
                id="tts-speed-range-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={speed}
                onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                <span>০.৫০x (খুব ধীর)</span>
                <span>০.৮৫x (স্বাভাবিক)</span>
                <span>১.০x</span>
                <span>২.০০x (খুব দ্রুত)</span>
              </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
              {presets.map((p) => {
                const isSelected = Math.abs(speed - p.value) < 0.02;
                return (
                  <button
                    key={p.value}
                    id={`tts-speed-preset-${p.value}`}
                    type="button"
                    onClick={() => handleSpeedChange(p.value)}
                    className={`px-2.5 py-2 rounded-xl text-center transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md font-bold'
                        : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{p.label}</div>
                    <div className="text-[10px] opacity-80 truncate">{p.desc.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Interactive Real-Time Voice & Language Test */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-blue-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                গতি ও ভাষা পরীক্ষা করুন (Test Voice Now)
              </span>
              {isTesting && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  শব্দ শুনুন...
                </span>
              )}
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-400 italic bg-white/60 dark:bg-stone-900/60 p-2.5 rounded-xl border border-stone-200/50 dark:border-stone-800/50">
              "{sampleText}"
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="tts-test-play-btn"
                type="button"
                onClick={handlePlayTest}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                  isTesting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isTesting ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>টেস্ট থামান</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      শুনুন ({speed.toFixed(2)}x •{' '}
                      {preferredLang === 'bn' ? 'বাংলা' : preferredLang === 'en' ? 'English' : 'Auto'})
                    </span>
                  </>
                )}
              </button>

              <button
                id="tts-reset-defaults-btn"
                type="button"
                onClick={handleResetToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                title="ডিফল্ট সেটিংস (0.85x ও স্বয়ংক্রিয় ভাষা) এ রিসেট করুন"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিসেট</span>
              </button>
            </div>
          </div>

          {/* Section 4: TTS Engine Mode & Device Voice Selection */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              অডিও ইঞ্জিন ও ডিভাইস কণ্ঠ নির্বাচন
            </h4>

            {/* Mode selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('natural')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  preferredMode === 'natural'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                    : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    প্রাকৃতিক স্ট্রিমিং অডিও
                  </span>
                  {preferredMode === 'natural' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] opacity-75">
                  হাই-ফিডেলিটি নির্ভুল বাংলা ও ইংরেজি উচ্চারণ
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange('browser')}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  preferredMode === 'browser'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-200'
                    : 'bg-stone-50 dark:bg-stone-950/40 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-blue-500" />
                    ডিভাইস ভয়েস ইঞ্জিন
                  </span>
                  {preferredMode === 'browser' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] opacity-75">
                  সরাসরি ফোনের বা ব্রাউজারের বিল্ট-ইন স্পিচ সিন্থেসাইজার
                </p>
              </button>
            </div>

            {/* Voice URI Dropdown (if device voices available) */}
            {availableVoices.length > 0 && (
              <div className="space-y-1.5">
                <label
                  htmlFor="tts-device-voice-select"
                  className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5"
                >
                  <Languages className="w-3.5 h-3.5 text-stone-500" />
                  ডিভাইস ভয়েস (Browser Installed Voice)
                </label>
                <select
                  id="tts-device-voice-select"
                  value={selectedVoiceURI}
                  onChange={(e) => handleVoiceChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="auto">✨ স্বয়ংক্রিয় নির্বাচন (নির্বাচিত ভাষা অনুযায়ী)</option>
                  {bengaliVoices.length > 0 && (
                    <optgroup label="বাংলা ভয়েস (Bengali Voices)">
                      {bengaliVoices.map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          🇧🇩 {v.name} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {englishVoices.length > 0 && (
                    <optgroup label="ইংরেজি কণ্ঠ (English Voices)">
                      {englishVoices.slice(0, 12).map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          🌐 {v.name} ({v.lang})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400">
            {savedSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                ভাষা, গতি ও সেটিংস সংরক্ষিত হয়েছে!
              </span>
            ) : (
              <span>আপনার নির্বাচিত ভাষা ও গতি পরবর্তী সকল মেসেজে স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে।</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
            >
              সম্পন্ন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
