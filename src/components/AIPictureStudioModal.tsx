import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Download, 
  Maximize2, 
  RotateCw, 
  Copy, 
  Check, 
  Send, 
  Image as ImageIcon, 
  Sliders, 
  Layers, 
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { authenticatedFetch } from '../utils/apiAuth';
import { MediaLightboxModal } from './MediaLightboxModal';

interface AIPictureStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  initialAspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  onSendToChat?: (prompt: string, imageUrl?: string) => void;
}

interface PromptIdea {
  titleBn: string;
  prompt: string;
  category: string;
  style: string;
}

const SAMPLE_IDEAS: PromptIdea[] = [
  {
    titleBn: 'কক্সবাজার সমুদ্র সৈকত ও সূর্যাস্ত',
    prompt: 'A serene golden sunset over Coxs Bazar beach in Bangladesh with traditional wooden fishing boats on calm sea waves',
    category: 'প্রকৃতি',
    style: 'cinematic',
  },
  {
    titleBn: 'ভবিষ্যতের সবুজ ঢাকা শহর',
    prompt: 'Futuristic green Dhaka city in 2050 with elevated metro trains, vertical lush gardens, high-tech bridges and sleek architecture',
    category: 'ফিউচারিস্টিক',
    style: 'digital-art',
  },
  {
    titleBn: 'কিউট মহাকাশচারী বিড়ালছানা',
    prompt: 'An adorable fluffy kitten wearing a tiny detailed astronaut helmet sitting on the lunar surface gazing at planet earth',
    category: 'অ্যানিম্যাল ও ফ্যান্টাসি',
    style: '3d',
  },
  {
    titleBn: 'বৃষ্টিভেজা গ্রামীণ কাশবন ও নদী',
    prompt: 'A tranquil Bangladeshi rural river bank during monsoon season, white kashbon flowers gently swaying in the rain breeze, wooden boat',
    category: 'প্রকৃতি',
    style: 'watercolor',
  },
  {
    titleBn: 'সাইবারপাঙ্ক নিয়ন ডেভেলপার রোবট',
    prompt: 'A sleek humanoid robot software engineer working at multiple glowing holographic monitors in a dark cyberpunk studio',
    category: 'প্রযুক্তি',
    style: 'cinematic',
  },
  {
    titleBn: 'ঐতিহ্যবাহী লালবাগ কেল্লা ও ফুলবাগান',
    prompt: 'Lalbagh Fort in Old Dhaka in golden hour sunlight surrounded by blooming red roses and historical Mughal architecture',
    category: 'ঐতিহ্য',
    style: 'photorealistic',
  },
];

const ASPECT_RATIOS: Array<{
  id: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  label: string;
  desc: string;
  iconClass: string;
}> = [
  { id: '1:1', label: '১:১ বর্গাকার', desc: 'স্কয়ার / অবতার / ইনস্টাগ্রাম', iconClass: 'w-4 h-4' },
  { id: '16:9', label: '১৬:৯ ল্যান্ডস্কেপ', desc: 'ইউটিউব / ওয়ালপেপার / ডেস্কটপ', iconClass: 'w-5 h-3' },
  { id: '9:16', label: '৯:১৬ পোর্ট্রেট', desc: 'রিলস / স্টোরি / মোবাইল ওয়ালপেপার', iconClass: 'w-3 h-5' },
  { id: '4:3', label: '৪:৩ স্ট্যান্ডার্ড', desc: 'ক্লাসিক ফটোগ্রাফি', iconClass: 'w-4 h-3.5' },
  { id: '3:4', label: '৩:৪ উলম্ব', desc: 'পোর্ট্রেট ফটোগ্রাফি', iconClass: 'w-3.5 h-4' },
];

const STYLES: Array<{ id: string; label: string; icon: string }> = [
  { id: 'photorealistic', label: 'ফটোরিয়ালিস্টিক (8K)', icon: '📸' },
  { id: 'digital-art', label: 'ডিজিটাল আর্ট', icon: '🎨' },
  { id: 'cinematic', label: 'সিনেমাটিক লাইটিং', icon: '🎬' },
  { id: 'watercolor', label: 'জলরং / ওয়াটারকালার', icon: '🖌️' },
  { id: 'anime', label: 'অ্যানিমে ও কমিক', icon: '🎎' },
  { id: '3d', label: '৩ডি রেন্ডার', icon: '🧊' },
];

export const AIPictureStudioModal: React.FC<AIPictureStudioModalProps> = ({
  isOpen,
  onClose,
  initialPrompt = '',
  initialAspectRatio = '1:1',
  onSendToChat,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>(initialAspectRatio);
  const [selectedStyle, setSelectedStyle] = useState('photorealistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  React.useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  if (!isOpen) return null;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setDownloadSuccess(false);

    try {
      const response = await authenticatedFetch('/api/image/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          aspectRatio,
          style: selectedStyle,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'ছবি তৈরি করতে ব্যর্থ হয়েছে');
      }

      setResultImageUrl(data.imageUrl);
    } catch (err: any) {
      console.error('Image generation error:', err);
      setErrorMsg(err.message || 'ছবি তৈরি করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!resultImageUrl) return;
    try {
      const ext = resultImageUrl.includes('png') ? 'png' : 'jpg';
      const cleanSlug = prompt.slice(0, 20).replace(/[^a-zA-Z0-9\u0980-\u09FF]/g, '_');
      const filename = `ai-art_${cleanSlug || 'picture'}_${Date.now()}.${ext}`;

      const link = document.createElement('a');
      link.href = resultImageUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error('Download error:', e);
    }
  };

  const handleCopyLink = () => {
    if (!resultImageUrl) return;
    navigator.clipboard.writeText(resultImageUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleInsertToChat = () => {
    if (!resultImageUrl) return;
    onSendToChat?.(prompt, resultImageUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>AI ছবি ও আর্ট স্টুডিও</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                  Pro Studio
                </span>
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                যেকোনো চিন্তা বা বিবরণ লিখুন — কৃত্রিম বুদ্ধিমত্তা নিমেষেই সুন্দর ছবি তৈরি ও ডাউনলোড করে দেবে
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Prompt Input Section */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              ছবির বিবরণ বা প্রম্পট লিখুন (বাংলা বা ইংরেজি):
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="যেমন: কক্সবাজার সমুদ্র সৈকতে রঙিন নৌকায় সূর্যাস্ত, ৪k কোয়ালিটি, শান্ত পরিবেশ..."
                className="w-full p-3.5 rounded-2xl bg-stone-100/90 dark:bg-stone-950/80 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none transition-all placeholder:text-stone-400"
              />
              {prompt && (
                <button
                  type="button"
                  onClick={() => setPrompt('')}
                  className="absolute top-3 right-3 p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 text-xs"
                  title="মুছে ফেলুন"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Configuration Grid: Aspect Ratio & Styles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>ছবির আকার ও অনুপাত (Aspect Ratio):</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ASPECT_RATIOS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspectRatio(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      aspectRatio === item.id
                        ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="font-bold text-xs">{item.label}</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Art Style Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-500" />
                <span>শিল্পরীতি বা স্টাইল (Art Style):</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStyle(st.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedStyle === st.id
                        ? 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500'
                        : 'border-stone-200 dark:border-stone-800 hover:bg-stone-100/80 dark:hover:bg-stone-800/60 text-stone-700 dark:text-stone-300'
                    }`}
                  >
                    <div className="text-base">{st.icon}</div>
                    <div className="font-semibold text-xs mt-1 truncate">{st.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Prompt Ideas Pills */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
              💡 জনপ্রিয় আইডিয়া (ক্লিক করলেই প্রম্পট বসে যাবে):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_IDEAS.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(idea.prompt);
                    setSelectedStyle(idea.style);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs bg-stone-100 hover:bg-emerald-50 dark:bg-stone-800 dark:hover:bg-emerald-950/40 text-stone-700 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-300 border border-stone-200/80 dark:border-stone-700/80 transition-colors cursor-pointer"
                >
                  {idea.titleBn}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button Action */}
          <div>
            <button
              type="button"
              disabled={isGenerating || !prompt.trim()}
              onClick={() => handleGenerate()}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isGenerating || !prompt.trim()
                  ? 'bg-stone-400 dark:bg-stone-800 cursor-not-allowed opacity-75'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/25 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>ছবি আঁকা হচ্ছে... দয়া করে অপেক্ষা করুন (৫-৮ সেকেন্ড)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ছবি তৈরি করুন (Generate Picture)</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Generated Result Showcase Card */}
          {resultImageUrl && (
            <div className="rounded-3xl overflow-hidden border border-emerald-500/30 bg-stone-50 dark:bg-stone-950 p-4 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    ছবি সফলভাবে তৈরি হয়েছে!
                  </span>
                </div>
                <div className="text-[11px] font-mono text-stone-500">
                  {aspectRatio}
                </div>
              </div>

              {/* Preview Canvas */}
              <div 
                onClick={() => setIsLightboxOpen(true)}
                className="relative max-h-[460px] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center cursor-zoom-in group shadow-inner"
              >
                <img
                  src={resultImageUrl}
                  alt={prompt}
                  className="w-full h-auto max-h-[460px] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-xl bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>ফুলস্ক্রিন জুম</span>
                  </span>
                </div>
              </div>

              {/* Big Prominent Action Buttons Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* 1-Click Direct Download Button */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                    downloadSuccess
                      ? 'bg-emerald-600'
                      : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700'
                  }`}
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ডাউনলোড সম্পন্ন!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>ছবি ডাউনলোড করুন (Download)</span>
                    </>
                  )}
                </button>

                {/* Send to Chat Button */}
                {onSendToChat && (
                  <button
                    type="button"
                    onClick={handleInsertToChat}
                    className="py-3 px-4 rounded-2xl font-semibold text-xs bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>চ্যাটে পাঠান (Insert into Chat)</span>
                  </button>
                )}

                {/* Regenerate Button */}
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerate()}
                  className="py-3 px-4 rounded-2xl font-semibold text-xs bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>অন্য রূপ তৈরি করুন (Regenerate)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox for generated image */}
      {resultImageUrl && (
        <MediaLightboxModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          mediaType="image"
          src={resultImageUrl}
          title={prompt}
          alt={prompt}
        />
      )}
    </div>
  );
};
