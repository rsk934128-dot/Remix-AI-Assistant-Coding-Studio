import React, { useState, useEffect } from 'react';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Maximize2, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaType: 'image' | 'video';
  src: string;
  title?: string;
  alt?: string;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  mediaType,
  src,
  title,
  alt,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [metaInfo, setMetaInfo] = useState<{ width?: number; height?: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setCopied(false);
      setMetaInfo(null);
    }
  }, [isOpen, src]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(4, s + 0.25));
      } else if (e.key === '-') {
        setScale((s) => Math.max(0.5, s - 0.25));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => (r + 90) % 360);
      } else if (e.key === '0') {
        setScale(1);
        setRotation(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = src.split('/').pop()?.split('?')[0] || (mediaType === 'image' ? 'download-image.jpg' : 'download-video.mp4');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md transition-all animate-in fade-in select-none"
      onClick={onClose}
    >
      {/* Top Action Bar */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-stone-900/90 border-b border-stone-800 text-white shrink-0 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
            {mediaType === 'image' ? 'ইমেজ ভিউয়ার' : 'ভিডিও ভিউয়ার'}
          </span>
          <h3 className="text-xs sm:text-sm font-semibold truncate text-stone-200">
            {title || alt || (mediaType === 'image' ? 'উচ্চ রেজোলিউশন ছবি' : 'ফুলস্ক্রিন ভিডিও')}
          </h3>
          {metaInfo?.width && metaInfo?.height && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-stone-400 font-mono bg-stone-800 px-2 py-0.5 rounded border border-stone-700">
              <Info className="w-3 h-3 text-emerald-400" />
              {metaInfo.width} × {metaInfo.height} px
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {mediaType === 'image' && (
            <>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(4, s + 0.25))}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="জুম ইন (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="জুম আউট (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="ঘোরান / Rotate 90° (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setRotation(0);
                }}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="রিসেট (0)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
            title="লিঙ্ক কপি করুন"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-md"
            title="ডাউনলোড করুন"
          >
            <Download className="w-4 h-4" />
          </button>

          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
            title="নতুন ট্যাবে আসল লিংকে খুলুন"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-rose-600 text-stone-300 hover:text-white transition-colors cursor-pointer ml-1"
            title="বন্ধ করুন (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div 
        className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
        onClick={(e) => {
          // If clicked directly on the canvas background, close
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {mediaType === 'image' ? (
          <div 
            className="relative flex items-center justify-center transition-transform duration-200 ease-out max-w-full max-h-full"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt || title || 'Fullscreen Preview'}
              referrerPolicy="no-referrer"
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg shadow-2xl transition-all"
              onLoad={(e) => {
                const img = e.currentTarget;
                setMetaInfo({ width: img.naturalWidth, height: img.naturalHeight });
              }}
            />
          </div>
        ) : (
          <div 
            className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border border-stone-800"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>

      {/* Bottom Hint Bar */}
      <div 
        className="py-2.5 px-4 bg-stone-900/90 border-t border-stone-800 text-center text-xs text-stone-400 flex items-center justify-center gap-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {mediaType === 'image' ? (
          <span>
            টিপস: জুম করতে <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 font-mono text-[11px]">+</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 font-mono text-[11px]">-</kbd>, ঘোরাতে <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 font-mono text-[11px]">R</kbd>, এবং বন্ধ করতে <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 font-mono text-[11px]">Esc</kbd> চাপুন
          </span>
        ) : (
          <span>ভিডিও প্লেয়ার • ফুলস্ক্রিন ও পিকচার-ইন-পিকচার সমর্থিত • বন্ধ করতে <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-200 font-mono text-[11px]">Esc</kbd> চাপুন</span>
        )}
      </div>
    </div>
  );
};
