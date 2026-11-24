import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Briefcase,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  Lock,
  Globe,
  Radio,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  FolderKanban,
  Code2,
} from 'lucide-react';
import { useMiniBrowser } from '../context/MiniBrowserContext';

interface PortfolioPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (prompt: string) => void;
}

const PORTFOLIO_BASE_URL = 'https://portfolio-pwa-azure.vercel.app/';
const PORTFOLIO_DEFAULT_URL = 'https://portfolio-pwa-azure.vercel.app/#projects';

const PORTFOLIO_SECTIONS: Array<{ id: string; label: string; url: string }> = [
  { id: 'projects', label: '#projects', url: `${PORTFOLIO_BASE_URL}#projects` },
  { id: 'home', label: 'হোম', url: PORTFOLIO_BASE_URL },
  { id: 'about', label: '#about', url: `${PORTFOLIO_BASE_URL}#about` },
  { id: 'skills', label: '#skills', url: `${PORTFOLIO_BASE_URL}#skills` },
  { id: 'contact', label: '#contact', url: `${PORTFOLIO_BASE_URL}#contact` },
];

export const PortfolioPwaModal: React.FC<PortfolioPwaModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const miniBrowser = useMiniBrowser();
  const [currentUrl, setCurrentUrl] = useState(PORTFOLIO_DEFAULT_URL);
  const [activeSection, setActiveSection] = useState('projects');
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(PORTFOLIO_DEFAULT_URL);
      setActiveSection('projects');
      setIsLoading(true);
      setHasLoadError(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasLoadError(false);
    }
  }, [isOpen, iframeKey, currentUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  const handleSelectSection = (section: { id: string; url: string }) => {
    setActiveSection(section.id);
    setCurrentUrl(section.url);
    setIsLoading(true);
    setHasLoadError(false);
    setIframeKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div
      id="portfolio-pwa-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 rounded-none border-0 h-full w-full max-w-none'
            : 'max-w-6xl h-[92vh] max-h-[920px]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-stone-900 via-slate-900 to-stone-950 border-b border-stone-800/80 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-sky-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-sky-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-1.5">
                  <span>Sheikh Farid — Portfolio PWA</span>
                  <span className="text-[11px] font-semibold text-sky-400 font-mono hidden sm:inline">
                    (Projects Showcase)
                  </span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span>লাইভ PWA আইফ্রেম</span>
                </span>
              </div>

              {/* URL Display */}
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 truncate font-mono">
                <Lock className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{currentUrl}</span>
              </div>
            </div>
          </div>

          {/* Right: Controls & Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {onSendToChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSendToChat('শেখ ফরিদের Portfolio PWA (https://portfolio-pwa-azure.vercel.app/#projects) এবং তাঁর ফুল-স্ট্যাক ও মোবাইল প্রজেক্ট শোকেস সম্পর্কে বিস্তারিত আলোচনা করুন।');
                }}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-700/50 text-xs font-semibold transition-all cursor-pointer"
                title="এআই চ্যাটে পোর্টফোলিও ও প্রজেক্ট নিয়ে আলোচনা করুন"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>চ্যাটে জানুন</span>
              </button>
            )}

            {/* Open in Mini Browser */}
            <button
              type="button"
              onClick={() => {
                onClose();
                miniBrowser.openBrowser(currentUrl, 'web');
              }}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
              title="মিনি গুগল ব্রাউজারে খুলুন"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden md:inline">মিনি ব্রাউজার</span>
            </button>

            {/* Reload Iframe */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="আইফ্রেম রিলোড করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>

            {/* Toggle Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'ফুলস্ক্রিন বন্ধ করুন (Esc)' : 'ফুলস্ক্রিন মোড'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Open in New Window */}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors inline-flex items-center justify-center"
              title="নতুন ট্যাবে Portfolio PWA খুলুন"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors cursor-pointer ml-1"
              title="বন্ধ করুন (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Quick-Jump Bar */}
        <div className="px-4 sm:px-6 py-2 bg-stone-950/90 border-b border-stone-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1 mr-1 shrink-0">
              <FolderKanban className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">সেকশন জাম্প:</span>
            </span>
            {PORTFOLIO_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleSelectSection(sec)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                  activeSection === sec.id
                    ? 'bg-sky-600 text-white shadow-xs shadow-sky-600/30'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-mono text-stone-500 shrink-0">
            <Code2 className="w-3 h-3 text-sky-400" />
            <span>Full-Stack • Mobile • Offline PWA</span>
          </span>
        </div>

        {/* Iframe Viewport Container */}
        <div className="relative flex-1 bg-stone-950 w-full overflow-hidden flex flex-col">
          {/* Loading Indicator Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-stone-950/95 flex flex-col items-center justify-center gap-4 text-center px-4">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-sky-500/20 blur-xl animate-pulse" />
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500/20 via-blue-500/10 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center shadow-xl">
                  <Briefcase className="w-8 h-8 text-sky-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                  <span>Sheikh Farid Portfolio PWA লোড হচ্ছে...</span>
                </h4>
                <p className="text-xs text-stone-400">
                  অ্যাপের ভেতর সরাসরি প্রজেক্ট শোকেস (#projects) ও পোর্টফোলিও লোড করা হচ্ছে। অনুগ্রহ করে কয়েক সেকেন্ড অপেক্ষা করুন।
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-sky-400/90 bg-sky-950/50 px-3 py-1 rounded-full border border-sky-800/50">
                <Radio className="w-3 h-3 animate-ping" />
                <span>Connecting to Vercel Portfolio PWA</span>
              </div>
            </div>
          )}

          {/* Fallback Error Card if blocked or offline */}
          {hasLoadError && (
            <div className="absolute inset-0 z-25 bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Portfolio PWA আইফ্রেমে লোড হতে বিলম্ব হচ্ছে
              </h4>
              <p className="text-xs text-stone-400 max-w-md mb-5 leading-relaxed">
                নেটওয়ার্ক বা ব্রাউজার পলিসির কারণে আইফ্রেমে লোড হতে সমস্যা হলে আপনি রিলোড করতে পারেন অথবা নতুন ট্যাবে Portfolio PWA খুলতে পারেন।
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  পুনরায় চেষ্টা করুন
                </button>
                <a
                  href={currentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md shadow-sky-600/30"
                >
                  <span>নতুন ট্যাবে খুলুন</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* The Live Interactive Iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={currentUrl}
            title="Sheikh Farid - Portfolio PWA (#projects)"
            className="w-full h-full border-0 bg-[#05070a] select-auto"
            allow="clipboard-write; fullscreen; accelerometer; gyroscope"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            onLoad={() => {
              setIsLoading(false);
              setHasLoadError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasLoadError(true);
            }}
          />
        </div>

        {/* Bottom Status / Quick Info Bar */}
        <div className="px-4 py-2.5 sm:px-6 bg-stone-950 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-400 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-sky-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Portfolio PWA সক্রিয়</span>
            </span>
            <span className="hidden sm:inline text-stone-600">•</span>
            <span className="hidden sm:inline">Interactive Project Showcase &amp; Offline Caching</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[11px] font-mono font-bold text-sky-300">
              #{activeSection}
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[11px] font-bold text-indigo-300 hidden sm:inline">
              Android WebView &amp; PWA Ready
            </span>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1 hover:underline ml-1"
            >
              <span>ব্রাউজারে খুলুন</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
