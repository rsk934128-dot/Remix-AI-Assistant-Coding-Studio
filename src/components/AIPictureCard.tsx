import React, { useState } from 'react';
import { 
  Download, 
  Maximize2, 
  Copy, 
  Check, 
  RotateCw, 
  Sparkles, 
  Share2, 
  Sliders, 
  Palette,
  ExternalLink
} from 'lucide-react';
import { GeneratedImageMetadata } from '../types';
import { MediaLightboxModal } from './MediaLightboxModal';

interface AIPictureCardProps {
  imageMeta: GeneratedImageMetadata;
  onRegenerate?: (prompt: string, aspectRatio?: string) => void;
  onOpenStudio?: (prompt: string, aspectRatio?: string) => void;
}

export const AIPictureCard: React.FC<AIPictureCardProps> = ({
  imageMeta,
  onRegenerate,
  onOpenStudio,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const {
    url,
    prompt,
    aspectRatio = '1:1',
    mimeType = 'image/jpeg',
    width = 1024,
    height = 1024,
    source,
  } = imageMeta;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const ext = mimeType.includes('png') ? 'png' : 'jpg';
      const cleanPromptSlug = prompt
        .slice(0, 20)
        .replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_')
        .replace(/_+/g, '_');
      const filename = `ai-art_${cleanPromptSlug || 'picture'}_${Date.now()}.${ext}`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <div className="my-4 rounded-2xl overflow-hidden border border-emerald-500/25 dark:border-emerald-500/20 bg-stone-50 dark:bg-stone-900/80 shadow-lg hover:shadow-xl transition-all ring-1 ring-emerald-500/10 group">
        {/* Card Header Toolbar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 via-stone-100 to-emerald-500/5 dark:from-emerald-950/40 dark:via-stone-900/90 dark:to-emerald-950/20 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
              AI পিকচার
            </span>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-stone-200/80 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {aspectRatio} ({width}×{height})
            </span>
            {source && (
              <span className="hidden sm:inline-block text-[10px] text-stone-500 dark:text-stone-400 capitalize">
                • {source === 'gemini' ? 'Gemini AI' : 'Ultra-HD'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Direct 1-Click Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
              }`}
              title="ডিভাইসে ছবি নামিয়ে নিন (Download Image)"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>ডাউনলোড সম্পন্ন!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>ডাউনলোড করুন</span>
                </>
              )}
            </button>

            {/* Lightbox / Zoom Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="p-1.5 rounded-xl bg-stone-200/70 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
              title="বড় করে দেখুন (Fullscreen Lightbox)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div 
          onClick={() => setIsLightboxOpen(true)}
          className="relative max-h-[500px] w-full bg-stone-950 flex items-center justify-center overflow-hidden cursor-zoom-in"
        >
          <img
            src={url}
            alt={prompt}
            loading="lazy"
            className="w-full h-auto max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors pointer-events-none" />
        </div>

        {/* Prompt Caption & Quick Action Footer */}
        <div className="px-4 py-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
              <span className="font-semibold text-stone-900 dark:text-stone-100 mr-1.5">প্রম্পট:</span>
              <span>{prompt}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-stone-100 dark:border-stone-800 text-[11px]">
            <div className="flex items-center gap-2">
              {onRegenerate && (
                <button
                  type="button"
                  onClick={() => onRegenerate(prompt, aspectRatio)}
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-semibold cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>পুনরায় তৈরি করুন</span>
                </button>
              )}
              {onOpenStudio && (
                <button
                  type="button"
                  onClick={() => onOpenStudio(prompt, aspectRatio)}
                  className="flex items-center gap-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer ml-1"
                >
                  <Palette className="w-3 h-3 text-amber-500" />
                  <span>স্টুডিওতে এডিট</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 cursor-pointer"
                title="ইমেজ লিঙ্ক কপি করুন"
              >
                {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <MediaLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaType="image"
        src={url}
        title={prompt}
        alt={prompt}
      />
    </>
  );
};
