import React, { useState } from 'react';
import { 
  ZoomIn, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Image as ImageIcon, 
  AlertCircle,
  Maximize2
} from 'lucide-react';
import { MediaLightboxModal } from './MediaLightboxModal';

interface UniversalImageCardProps {
  src: string;
  alt?: string;
  title?: string;
}

export const UniversalImageCard: React.FC<UniversalImageCardProps> = ({
  src,
  alt,
  title,
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  const displayTitle = alt || title || 'ইমেজ প্রিভিউ';

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = src;
    if (src.startsWith('data:')) {
      const isPng = src.includes('png');
      a.download = `ai-picture-${Date.now()}.${isPng ? 'png' : 'jpg'}`;
    } else {
      a.download = src.split('/').pop()?.split('?')[0] || 'picture.jpg';
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Extract file extension or clean domain for badge
  let formatBadge = 'IMG';
  try {
    const ext = src.split('.').pop()?.split('?')[0]?.toUpperCase();
    if (ext && ext.length <= 4 && !ext.includes('/')) {
      formatBadge = ext;
    } else if (src.includes('unsplash')) {
      formatBadge = 'UNSPLASH';
    }
  } catch (_) {}

  return (
    <>
      <div 
        className="my-3.5 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 shadow-md hover:shadow-lg transition-all group"
      >
        {/* Top bar with quick buttons */}
        <div className="px-3.5 py-2 bg-white dark:bg-stone-850/90 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              {formatBadge}
            </span>
            <span className="font-semibold text-stone-700 dark:text-stone-200 truncate">
              {displayTitle}
            </span>
            {dimensions && (
              <span className="hidden sm:inline-block text-[10px] text-stone-400 font-mono">
                ({dimensions.width}×{dimensions.height})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs"
              title="বড় করে দেখুন (Lightbox Zoom)"
            >
              <Maximize2 className="w-3 h-3" />
              <span>বড় করুন</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              title="ইমেজ লিঙ্ক কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              title="ইমেজ ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 transition-colors"
              title="নতুন ট্যাবে আসল ছবিটি খুলুন"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Image Preview Canvas */}
        <div 
          onClick={() => setIsLightboxOpen(true)}
          className="relative max-h-96 w-full bg-stone-100 dark:bg-stone-950 flex items-center justify-center overflow-hidden cursor-zoom-in"
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-900 animate-pulse text-stone-400 gap-2 text-xs">
              <ImageIcon className="w-5 h-5 animate-spin" />
              <span>ছবি লোড হচ্ছে...</span>
            </div>
          )}

          {hasError ? (
            <div className="p-8 text-center text-rose-500 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto" />
              <p className="text-xs">ছবিটি লোড করা যায়নি (ব্রাউজার সিকিউরিটি বা লিংক মেয়াদোত্তীর্ণ)</p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-emerald-500 underline"
              >
                <span>আসল লিংকে দেখুন</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <img
              src={src}
              alt={displayTitle}
              referrerPolicy="no-referrer"
              className={`w-full max-h-96 object-contain transition-all duration-300 group-hover:scale-101 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={(e) => {
                setIsLoading(false);
                const img = e.currentTarget;
                setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
              }}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )}

          {/* Hover zoom overlay badge */}
          {!hasError && !isLoading && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-none">
              <ZoomIn className="w-3 h-3" />
              <span>ক্লিক করে জুম করুন</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaType="image"
        src={src}
        title={displayTitle}
        alt={alt}
      />
    </>
  );
};
