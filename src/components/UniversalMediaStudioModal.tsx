import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Play, 
  Pause, 
  Film, 
  Image as ImageIcon, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Maximize2, 
  Send, 
  Sparkles, 
  Sliders, 
  Repeat, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  HelpCircle,
  History,
  Trash2,
  Tv
} from 'lucide-react';
import { inspectMediaUrl, extractVimeoId, extractDailymotionId, extractDriveVideoId, extractYouTubeId } from '../utils/mediaUtils';
import { MediaLightboxModal } from './MediaLightboxModal';

interface UniversalMediaStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
  onSendToChat?: (prompt: string) => void;
}

interface SampleMedia {
  title: string;
  category: 'video' | 'image';
  url: string;
  description: string;
}

const SAMPLE_MEDIA_LIST: SampleMedia[] = [
  {
    title: 'প্রকৃতির হাই-ডেফিনিশন ভিডিও (MP4)',
    category: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'এইচটিএমএল৫ সরাসরি MP4 ভিডিও প্লেব্যাক টেস্ট',
  },
  {
    title: 'অ্যাকশন সিনেমাটিক ভিডিও (MP4)',
    category: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'ফুল এইচডি অডিও-ভিডিও স্ট্রিম',
  },
  {
    title: 'Vimeo সিনেমাটিক শর্ট ফিল্ম',
    category: 'video',
    url: 'https://vimeo.com/76979871',
    description: 'ভিমিও অফিসিয়াল এমবেড প্লেয়ার টেস্ট',
  },
  {
    title: 'ইউটিউব রবীন্দ্র সঙ্গীত ও ভিডিও',
    category: 'video',
    url: 'https://www.youtube.com/watch?v=maGEkZUFlKU',
    description: 'ইউটিউব অটো-কন্টিনিউয়াস ভিডিও ও অডিও',
  },
  {
    title: 'Unsplash 4K হিমালয় পর্বতমালার ছবি',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    description: 'আল্ট্রা এইচডি ন্যাচারাল ল্যান্ডস্কেপ জুম টেস্ট',
  },
  {
    title: 'মহাকাশ ও নীহারিকা গ্যালাক্সির ছবি',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
    description: 'কালারফুল ডিপ স্পেস ফটোগ্রাফি',
  },
  {
    title: 'কম্পিউটার কোডিং ও আর্কিটেকচার ছবি',
    category: 'image',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1600&q=80',
    description: 'সফটওয়্যার ডেভেলপমেন্ট ভিজ্যুয়াল',
  },
];

const HISTORY_STORAGE_KEY = 'universal_media_studio_history_v1';

export const UniversalMediaStudioModal: React.FC<UniversalMediaStudioModalProps> = ({
  isOpen,
  onClose,
  initialUrl = '',
  onSendToChat,
}) => {
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [activeUrl, setActiveUrl] = useState(initialUrl || SAMPLE_MEDIA_LIST[0].url);
  const [copied, setCopied] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [videoSpeed, setVideoSpeed] = useState(1);
  const [isLoop, setIsLoop] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [metaInfo, setMetaInfo] = useState<{ width?: number; height?: number } | null>(null);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (initialUrl) {
      setInputUrl(initialUrl);
      setActiveUrl(initialUrl);
      saveToHistory(initialUrl);
    }
  }, [initialUrl]);

  const saveToHistory = (url: string) => {
    if (!url.trim()) return;
    setHistory((prev) => {
      const filtered = prev.filter((u) => u !== url);
      const updated = [url, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const handleInspect = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) return;
    setActiveUrl(trimmed);
    setImageScale(1);
    setImageRotation(0);
    saveToHistory(trimmed);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = activeUrl;
    a.download = activeUrl.split('/').pop()?.split('?')[0] || 'media-download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendToChat = () => {
    if (!onSendToChat) return;
    const mediaInfo = inspectMediaUrl(activeUrl);
    let prompt = '';
    if (mediaInfo.type === 'image') {
      prompt = `দয়া করে এই ছবিটি বিশ্লেষণ করুন এবং এর বিস্তারিত বর্ণনা দিন:\n\n![ছবি](${activeUrl})`;
    } else {
      prompt = `আমি এই ভিডিওটি দেখতে চাই ও এর বিষয়ে কথা বলতে চাই:\n\n${activeUrl}`;
    }
    onSendToChat(prompt);
    onClose();
  };

  if (!isOpen) return null;

  const mediaInfo = inspectMediaUrl(activeUrl);
  const ytId = extractYouTubeId(activeUrl);
  const vimeoId = extractVimeoId(activeUrl);
  const dmId = extractDailymotionId(activeUrl);
  const driveId = extractDriveVideoId(activeUrl);

  const isVideo = ['youtube', 'vimeo', 'dailymotion', 'drive_video', 'direct_video'].includes(mediaInfo.type);
  const isImage = mediaInfo.type === 'image';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                  ইউনিভার্সাল মিডিয়া প্লেয়ার ও ইমেজ স্টুডিও
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  যেকোনো লিংক প্লেয়ার
                </span>
              </div>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                ইন্টারনেটের যেকোনো ভিডিও লিংক সরাসরি প্লে করুন অথবা যেকোনো ইমেজ লিংক জুম ও ডাউনলোড করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Input Bar */}
        <div className="p-4 bg-stone-100/70 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800 shrink-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInspect()}
                placeholder="এখানে যেকোনো ভিডিও লিংক (MP4, WebM, YouTube, Vimeo) বা ইমেজ লিংক (JPG, PNG, GIF, Unsplash) পেস্ট করুন..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-850 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner pr-10"
              />
              {inputUrl && (
                <button
                  type="button"
                  onClick={() => setInputUrl('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleInspect}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>প্লে / ভিউ করুন</span>
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              রেডিমেড স্যাম্পল:
            </span>
            {SAMPLE_MEDIA_LIST.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setInputUrl(sample.url);
                  setActiveUrl(sample.url);
                  setImageScale(1);
                  setImageRotation(0);
                  saveToHistory(sample.url);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border shrink-0 transition-all cursor-pointer ${
                  activeUrl === sample.url
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : 'bg-white dark:bg-stone-850 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-750 hover:border-emerald-400'
                }`}
              >
                {sample.category === 'video' ? '🎬' : '🖼️'} {sample.title}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* Active Player / Viewer Container */}
          <div className="rounded-2xl overflow-hidden border border-stone-300 dark:border-stone-800 bg-stone-950 text-white shadow-xl">
            {/* Top Info Toolbar */}
            <div className="px-4 py-2.5 bg-stone-900 border-b border-stone-800 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {mediaInfo.title || 'মিডিয়া'}
                </span>
                <span className="font-mono text-[11px] text-stone-300 truncate max-w-sm sm:max-w-md">
                  {activeUrl}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                  title="ফুলস্ক্রিনে দেখুন"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span className="hidden sm:inline">ফুলস্ক্রিন</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  title="লিঙ্ক কপি করুন"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
                  title="ডাউনলোড করুন"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  title="আসল লিংকে খুলুন"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Media Canvas */}
            <div className="relative min-h-[320px] max-h-[500px] w-full bg-black flex items-center justify-center overflow-hidden">
              {/* 1. YouTube */}
              {ytId && (
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    title="YouTube Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* 2. Vimeo */}
              {vimeoId && !ytId && (
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1`}
                    title="Vimeo Player"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* 3. Dailymotion */}
              {dmId && !ytId && !vimeoId && (
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://www.dailymotion.com/embed/video/${dmId}?autoplay=1`}
                    title="Dailymotion Player"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* 4. Google Drive Video */}
              {driveId && !ytId && !vimeoId && !dmId && (
                <div className="w-full aspect-video">
                  <iframe
                    src={`https://drive.google.com/file/d/${driveId}/preview`}
                    title="Google Drive Player"
                    allow="autoplay"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}

              {/* 5. Direct Video File (.mp4, .webm, etc.) */}
              {mediaInfo.type === 'direct_video' && !ytId && !vimeoId && !dmId && !driveId && (
                <video
                  ref={videoRef}
                  src={activeUrl}
                  controls
                  autoPlay
                  playsInline
                  loop={isLoop}
                  className="max-h-[480px] w-full object-contain"
                />
              )}

              {/* 6. Image */}
              {isImage && (
                <div 
                  className="p-4 flex items-center justify-center transition-transform duration-200 ease-out"
                  style={{
                    transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                  }}
                >
                  <img
                    src={activeUrl}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="max-h-[420px] max-w-full object-contain rounded-lg shadow-2xl"
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setMetaInfo({ width: img.naturalWidth, height: img.naturalHeight });
                    }}
                  />
                </div>
              )}

              {/* 7. Unknown URL fallback */}
              {!isVideo && !isImage && (
                <div className="p-8 text-center text-stone-400 space-y-3">
                  <AlertCircle className="w-10 h-10 mx-auto text-amber-500" />
                  <p className="text-sm font-semibold text-stone-200">
                    লিংকটি সরাসরি ভিডিও বা ইমেজ ফাইল হিসেবে নিশ্চিত হওয়া যায়নি।
                  </p>
                  <p className="text-xs text-stone-400 max-w-md mx-auto">
                    আমরা এটি ভিডিও ও ছবি উভয় মোডেই চেষ্টা করতে পারি, অথবা আপনি নিচের লিংকে ক্লিক করে ব্রাউজারে খুলতে পারেন।
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveUrl((u) => u + '#force-video')}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                    >
                      ভিডিও হিসেবে চালান
                    </button>
                    <a
                      href={activeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold"
                    >
                      আসল ওয়েব লিংকে দেখুন
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar for Images or Videos */}
            <div className="px-4 py-3 bg-stone-900 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              {isImage ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-stone-400">ইমেজ কন্ট্রোল:</span>
                  <button
                    type="button"
                    onClick={() => setImageScale((s) => Math.min(3, s + 0.25))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>জুম ইন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageScale((s) => Math.max(0.5, s - 0.25))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                    <span>জুম আউট</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageRotation((r) => (r + 90) % 360)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>ঘোরান (90°)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageScale(1);
                      setImageRotation(0);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>রিসেট</span>
                  </button>
                  {metaInfo && (
                    <span className="text-[11px] text-stone-400 font-mono">
                      {metaInfo.width} × {metaInfo.height} px
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-stone-400">প্লেয়ার স্পিড:</span>
                  {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setVideoSpeed(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                      }}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        videoSpeed === s ? 'bg-emerald-600 text-white font-bold' : 'bg-stone-800 text-stone-300 hover:text-white'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoop(!isLoop);
                      if (videoRef.current) videoRef.current.loop = !isLoop;
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer ${
                      isLoop ? 'bg-emerald-600 text-white font-bold' : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>লুপ {isLoop ? 'চালু' : 'বন্ধ'}</span>
                  </button>
                </div>
              )}

              {/* Send to chat button */}
              {onSendToChat && (
                <button
                  type="button"
                  onClick={handleSendToChat}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>চ্যাটে বিশ্লেষণ করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-400 font-bold">
                <span className="flex items-center gap-1">
                  <History className="w-3.5 h-3.5" />
                  সম্প্রতি দেখা মিডিয়া লিংকসমূহ ({history.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setHistory([]);
                    localStorage.removeItem(HISTORY_STORAGE_KEY);
                  }}
                  className="text-stone-400 hover:text-rose-500 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>মুছে ফেলুন</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {history.map((url, idx) => {
                  const info = inspectMediaUrl(url);
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setInputUrl(url);
                        setActiveUrl(url);
                        setImageScale(1);
                        setImageRotation(0);
                      }}
                      className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 hover:border-emerald-500 cursor-pointer flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">
                          {['youtube', 'vimeo', 'direct_video'].includes(info.type) ? '🎬' : '🖼️'}
                        </span>
                        <span className="text-xs text-stone-800 dark:text-stone-200 font-mono truncate">
                          {url}
                        </span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaType={isImage ? 'image' : 'video'}
        src={activeUrl}
        title={mediaInfo.title}
      />
    </div>
  );
};
