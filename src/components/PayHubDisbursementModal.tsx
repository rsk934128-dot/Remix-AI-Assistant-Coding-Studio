import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Wallet,
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
  Mail,
  Send,
} from 'lucide-react';
import { useMiniBrowser } from '../context/MiniBrowserContext';

interface PayHubDisbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendToChat?: (prompt: string) => void;
}

const PAYHUB_DISBURSEMENT_URL = 'https://pay-hub-gateway-gmail-disbursement.vercel.app/';

export const PayHubDisbursementModal: React.FC<PayHubDisbursementModalProps> = ({
  isOpen,
  onClose,
  onSendToChat,
}) => {
  const miniBrowser = useMiniBrowser();
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [hasLoadError, setHasLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasLoadError(false);
    }
  }, [isOpen, iframeKey]);

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

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <div
      id="payhub-disbursement-modal-overlay"
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
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-stone-900 via-teal-950/40 to-stone-950 border-b border-stone-800/80 flex items-center justify-between gap-3 shrink-0">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-600 to-cyan-600 p-0.5 shadow-lg shadow-teal-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center">
                <Wallet className="w-5 h-5 text-teal-400" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-white tracking-tight truncate flex items-center gap-1.5">
                  <span>PayHub Gateway &amp; Gmail Disbursement</span>
                  <span className="text-[11px] font-semibold text-teal-400 font-mono hidden sm:inline">
                    (PWA)
                  </span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span>লাইভ PWA আইফ্রেম</span>
                </span>
              </div>

              {/* URL Display */}
              <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5 truncate font-mono">
                <Lock className="w-3 h-3 text-teal-400 shrink-0" />
                <span className="truncate">{PAYHUB_DISBURSEMENT_URL}</span>
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
                  onSendToChat(
                    'PayHub Gateway & Gmail Disbursement PWA (https://pay-hub-gateway-gmail-disbursement.vercel.app/) এর Stripe, bKash ও Nagad B2C ডিসবার্সমেন্ট, অটোমেটেড Gmail API রিসিট এবং ট্রানজ্যাকশন লেজার সম্পর্কে বিস্তারিত জানান।'
                  );
                }}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 border border-teal-700/50 text-xs font-semibold transition-all cursor-pointer"
                title="এআই চ্যাটে PayHub Disbursement সম্পর্কে জানতে চান"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>চ্যাটে জানুন</span>
              </button>
            )}

            {/* Open in Mini Browser */}
            <button
              type="button"
              onClick={() => {
                onClose();
                miniBrowser.openBrowser(PAYHUB_DISBURSEMENT_URL, 'web');
              }}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
              title="মিনি গুগল ব্রাউজারে খুলুন"
            >
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden md:inline">মিনি ব্রাউজার</span>
            </button>

            {/* Reload Iframe */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
              title="আইফ্রেম রিলোড করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-teal-400' : ''}`} />
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
              href={PAYHUB_DISBURSEMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors inline-flex items-center justify-center"
              title="নতুন ট্যাবে PayHub Disbursement খুলুন"
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

        {/* Iframe Viewport Container */}
        <div className="relative flex-1 bg-stone-950 w-full overflow-hidden flex flex-col">
          {/* Loading Indicator Overlay */}
          {isLoading && (
            <div className="absolute inset-0 z-20 bg-stone-950/95 flex flex-col items-center justify-center gap-4 text-center px-4">
              <div className="relative flex items-center justify-center w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-teal-500/20 blur-xl animate-pulse" />
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-500/20 via-emerald-500/10 to-cyan-500/20 border border-teal-500/30 flex items-center justify-center shadow-xl">
                  <Wallet className="w-8 h-8 text-teal-400 animate-pulse" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                  <span>PayHub Disbursement PWA লোড হচ্ছে...</span>
                </h4>
                <p className="text-xs text-stone-400">
                  Stripe, bKash ও Nagad B2C ডিসবার্সমেন্ট এবং অটোমেটেড Gmail API রিসিট লেজার আইফ্রেমে লোড করা হচ্ছে।
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-teal-400/90 bg-teal-950/50 px-3 py-1 rounded-full border border-teal-800/50">
                <Radio className="w-3 h-3 animate-ping" />
                <span>Connecting to PayHub Disbursement</span>
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
                PayHub Disbursement আইফ্রেমে লোড হতে বিলম্ব হচ্ছে
              </h4>
              <p className="text-xs text-stone-400 max-w-md mb-5 leading-relaxed">
                নেটওয়ার্ক বা ব্রাউজার পলিসির কারণে আইফ্রেম লোড হতে সমস্যা হলে আপনি রিলোড করতে পারেন অথবা নতুন ট্যাবে অ্যাপটি খুলতে পারেন।
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
                  href={PAYHUB_DISBURSEMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-md shadow-teal-600/30"
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
            src={PAYHUB_DISBURSEMENT_URL}
            title="PayHub Gateway & Gmail Disbursement PWA"
            className="w-full h-full border-0 bg-white select-auto"
            allow="clipboard-write; fullscreen; payment"
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
            <span className="flex items-center gap-1.5 text-teal-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>PayHub Disbursement সক্রিয়</span>
            </span>
            <span className="hidden sm:inline text-stone-600">•</span>
            <span className="hidden sm:inline">Transaction Ledger • Enterprise B2C Disbursements</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[11px] font-bold text-teal-300 inline-flex items-center gap-1">
              <Send className="w-3 h-3" />
              <span>Stripe • bKash • Nagad</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-[11px] font-bold text-emerald-300 hidden sm:inline-flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span>Gmail API Receipts</span>
            </span>
            <a
              href={PAYHUB_DISBURSEMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1 hover:underline ml-1"
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
