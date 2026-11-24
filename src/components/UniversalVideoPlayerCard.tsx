import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Maximize2, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Film, 
  Sliders, 
  Repeat,
  AlertCircle
} from 'lucide-react';
import { extractVimeoId, extractDailymotionId, extractDriveVideoId } from '../utils/mediaUtils';
import { MediaLightboxModal } from './MediaLightboxModal';

interface UniversalVideoPlayerCardProps {
  src: string;
  title?: React.ReactNode;
}

export const UniversalVideoPlayerCard: React.FC<UniversalVideoPlayerCardProps> = ({
  src,
  title,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Check if it's Vimeo, Dailymotion, or Google Drive
  const vimeoId = extractVimeoId(src);
  const dailymotionId = extractDailymotionId(src);
  const driveId = extractDriveVideoId(src);

  const cleanTitle = typeof title === 'string' && title.trim() && title !== 'ভিডিও প্লেয়ার' && !title.startsWith('http')
    ? title
    : 'অনলাইন ভিডিও প্লেয়ার';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(src);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = src;
    a.download = src.split('/').pop()?.split('?')[0] || 'video.mp4';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  // 1. Vimeo Embed
  if (vimeoId) {
    return (
      <div className="my-4 rounded-2xl overflow-hidden border border-sky-500/30 bg-stone-950 text-stone-100 shadow-xl">
        <div className="px-3.5 py-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-sky-500 text-white shrink-0">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-200 truncate">Vimeo: {cleanTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
              title="লিঙ্ক কপি করুন"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-750 text-white font-medium text-[11px]"
            >
              <span>Vimeo খুলুন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&loop=0&byline=0&portrait=0`}
            title="Vimeo Video Player"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  // 2. Dailymotion Embed
  if (dailymotionId) {
    return (
      <div className="my-4 rounded-2xl overflow-hidden border border-blue-500/30 bg-stone-950 text-stone-100 shadow-xl">
        <div className="px-3.5 py-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-blue-600 text-white shrink-0">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-200 truncate">Dailymotion: {cleanTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-750 text-white font-medium text-[11px]"
            >
              <span>Dailymotion খুলুন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.dailymotion.com/embed/video/${dailymotionId}`}
            title="Dailymotion Video Player"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  // 3. Google Drive Video Preview Embed
  if (driveId) {
    return (
      <div className="my-4 rounded-2xl overflow-hidden border border-emerald-500/30 bg-stone-950 text-stone-100 shadow-xl">
        <div className="px-3.5 py-2.5 bg-stone-900/90 border-b border-stone-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded bg-amber-500 text-white shrink-0">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-200 truncate">Google Drive: {cleanTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-stone-800 hover:bg-stone-750 text-white font-medium text-[11px]"
            >
              <span>Drive এ খুলুন</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://drive.google.com/file/d/${driveId}/preview`}
            title="Google Drive Video Player"
            allow="autoplay"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      </div>
    );
  }

  // 4. Standard HTML5 Direct Video Player (.mp4, .webm, etc.)
  return (
    <>
      <div className="my-4 rounded-2xl overflow-hidden border border-emerald-500/40 bg-stone-950 text-stone-100 shadow-xl">
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-stone-900/95 border-b border-stone-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
              <Film className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-stone-200 truncate flex items-center gap-1.5">
              <span>{cleanTitle}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Playback speed menu */}
            <div className="flex items-center bg-stone-850 rounded-lg p-0.5 border border-stone-750 text-[11px]">
              {[1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedChange(s)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    speed === s ? 'bg-emerald-600 text-white font-bold' : 'text-stone-400 hover:text-white'
                  }`}
                  title={`${s}x স্পিড`}
                >
                  {s}x
                </button>
              ))}
            </div>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsLoop(!isLoop);
                if (videoRef.current) videoRef.current.loop = !isLoop;
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLoop ? 'bg-emerald-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-white'
              }`}
              title={isLoop ? 'লুপ চালু (Loop On)' : 'লুপ বন্ধ (Loop Off)'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Lightbox Button */}
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-[11px] font-bold shadow-xs cursor-pointer"
              title="ফুলস্ক্রিন লাইটবক্স প্লেয়ার"
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden sm:inline">ফুলস্ক্রিন</span>
            </button>

            {/* Download Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="ভিডিও ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="ভিডিও লিঙ্ক কপি করুন"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {hasError ? (
            <div className="p-6 text-center text-rose-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-xs font-semibold">ভিডিওটি লোড করতে সমস্যা হয়েছে (CORS বা লিংক মেয়াদোত্তীর্ণ হতে পারে)</p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold border border-stone-700"
              >
                <span>সরাসরি ব্রাউজারে খুলুন</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              preload="metadata"
              loop={isLoop}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onError={() => setHasError(true)}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-3.5 py-1.5 bg-stone-900 border-t border-stone-800/80 text-[11px] text-stone-400 flex items-center justify-between">
          <span className="truncate">এইচটিএমএল৫ ইউনিভার্সাল ভিডিও প্লেয়ার</span>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            <span>আসল সোর্স</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaType="video"
        src={src}
        title={cleanTitle}
      />
    </>
  );
};
