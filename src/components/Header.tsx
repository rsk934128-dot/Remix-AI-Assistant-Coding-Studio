import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Sparkles, 
  Layers, 
  Trash2, 
  Download, 
  Globe, 
  Plus, 
  Moon, 
  Sun,
  Code2,
  PenTool,
  Search,
  GraduationCap,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ExternalLink,
  FileDown,
  Server,
  ShieldCheck,
  Shield,
  Youtube,
  Music,
  Bot,
  HardDrive,
  Volume2,
  Gauge,
  Crown,
  UserCheck,
  Pin,
  PinOff,
  BarChart3,
  Mail,
  Cpu,
  Key,
  Bell,
  Tv,
  Palette,
  Briefcase,
  ShieldAlert,
  CreditCard,
  Wallet,
  Plane,
  Package,
  MessagesSquare,
  Rocket,
  BookMarked,
  Printer
} from 'lucide-react';
import { HorizontalProgramScroller } from './HorizontalProgramScroller';
import { AssistantMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { AppLogo } from './AppLogo';
import { UserAuthButton } from './UserAuthButton';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useAuth } from '../context/AuthContext';
import { useMiniBrowser } from '../context/MiniBrowserContext';
import { useNotifications } from '../context/NotificationContext';
import { UniversalTab } from './UniversalAppsConnectModal';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenArchitecture: () => void;
  onOpenHostingDiagnostic?: () => void;
  onOpenCitizenServices?: () => void;
  onOpenShurukkhaHub?: () => void;
  onOpenFreelanceAgent?: () => void;
  onOpenUniversalApps?: (tab?: UniversalTab) => void;
  onOpenMetrics?: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenTTSSettings?: () => void;
  onOpenFounderProfile?: () => void;
  onOpenEmailComposer?: () => void;
  onOpenMobilePrograms?: () => void;
  onOpenShareReceiver?: () => void;
  onOpenRubelNetManager?: () => void;
  onOpenYouTubeAuth?: () => void;
  onOpenDeveloperApi?: () => void;
  onOpenNotificationModal?: () => void;
  onOpenMediaStudio?: () => void;
  onOpenPictureStudio?: () => void;
  onOpenPortfolioPwa?: () => void;
  onOpenOmniSafeBrowser?: () => void;
  onOpenPaymentGatewayHub?: () => void;
  onOpenVideoAudioDownloader?: () => void;
  onOpenPayHubDisbursement?: () => void;
  onOpenUaeVisaHub?: () => void;
  onOpenApkEditorStudio?: () => void;
  onOpenPulseSms?: () => void;
  onOpenGitHubBusinessHub?: () => void;
  onOpenEmailTemplatesLibrary?: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onExportChat: () => void;
  onExportChatToPDF?: () => void;
  onOpenShareModal?: (config?: { title?: string; text?: string; url?: string; sessionId?: string; shareType?: 'session' | 'app' | 'message' }) => void;
  onSyncAll?: () => Promise<void>;
  mode: AssistantMode;
  enableSearch: boolean;
  hasMessages: boolean;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  activeSessionTitle?: string;
  isGeneratingTitle?: boolean;
  activeSessionId?: string;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenArchitecture,
  onOpenHostingDiagnostic,
  onOpenCitizenServices,
  onOpenShurukkhaHub,
  onOpenFreelanceAgent,
  onOpenUniversalApps,
  onOpenMetrics,
  onOpenGoogleDrive,
  onOpenTTSSettings,
  onOpenFounderProfile,
  onOpenEmailComposer,
  onOpenMobilePrograms,
  onOpenShareReceiver,
  onOpenRubelNetManager,
  onOpenYouTubeAuth,
  onOpenDeveloperApi,
  onOpenNotificationModal,
  onOpenMediaStudio,
  onOpenPictureStudio,
  onOpenPortfolioPwa,
  onOpenOmniSafeBrowser,
  onOpenPaymentGatewayHub,
  onOpenVideoAudioDownloader,
  onOpenPayHubDisbursement,
  onOpenUaeVisaHub,
  onOpenApkEditorStudio,
  onOpenPulseSms,
  onOpenGitHubBusinessHub,
  onOpenEmailTemplatesLibrary,
  onNewChat,
  onClearChat,
  onExportChat,
  onExportChatToPDF,
  onOpenShareModal,
  onSyncAll,
  mode,
  enableSearch,
  hasMessages,
  darkMode,
  setDarkMode,
  activeSessionTitle,
  isGeneratingTitle,
  activeSessionId,
  isPinned,
  onTogglePin,
}) => {
  const musicPlayer = useMusicPlayer();
  const miniBrowser = useMiniBrowser();
  const { isYouTubeConnected, youtubeUser } = useAuth();
  const { unreadCount } = useNotifications();
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    }
    if (isShareDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShareDropdownOpen]);

  // Construct shareable URL
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    try {
      const url = new URL(window.location.href);
      if (activeSessionId) {
        url.searchParams.set('session', activeSessionId);
      }
      return url.toString();
    } catch {
      return window.location.href;
    }
  };

  const shareTitle = activeSessionTitle && activeSessionTitle !== 'নতুন কথোপকথন'
    ? activeSessionTitle
    : 'AI Assistant & Coding Studio চ্যাট সেশন';

  const shareText = `${shareTitle} - বাংলা ও ইংরেজি ফুল-স্ট্যাক এআই সহকারী`;

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    const url = getShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        setIsShareDropdownOpen(false);
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSocialShare = (platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'telegram') => {
    const url = getShareUrl();
    let shareEndpoint = '';

    switch (platform) {
      case 'whatsapp':
        shareEndpoint = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + url)}`;
        break;
      case 'facebook':
        shareEndpoint = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareEndpoint = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareEndpoint = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'telegram':
        shareEndpoint = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
        break;
    }

    if (shareEndpoint) {
      window.open(shareEndpoint, '_blank', 'noopener,noreferrer,width=600,height=520');
      setIsShareDropdownOpen(false);
    }
  };
  const getModeInfo = (m: AssistantMode) => {
    switch (m) {
      case 'citizen':
        return { label: 'জনসেবা ও A-Z সমাধান', icon: ShieldCheck, color: 'text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/60' };
      case 'coding':
        return { label: 'কোডিং মোড', icon: Code2, color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60' };
      case 'writing':
        return { label: 'লেখালেখি ও অনুবাদ', icon: PenTool, color: 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60' };
      case 'research':
        return { label: 'গবেষণা ও ফ্যাক্ট-চেক', icon: Search, color: 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60' };
      case 'learning':
        return { label: 'পড়াশোনা ও কনসেপ্ট', icon: GraduationCap, color: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60' };
      default:
        return { label: 'সাধারণ অ্যাসিস্ট্যান্ট', icon: Sparkles, color: 'text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800' };
    }
  };

  const modeInfo = getModeInfo(mode);
  const ModeIcon = modeInfo.icon;

  return (
    <header
      id="app-header"
      className="border-b border-stone-200 dark:border-stone-800 bg-white/85 dark:bg-stone-900/85 backdrop-blur-md z-10 shrink-0 flex flex-col"
    >
      <div className="h-13 sm:h-14 px-3 sm:px-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Sidebar খুলুন/বন্ধ করুন"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <AppLogo size={32} withGlow={true} />
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-none">
              AI Assistant & Coding Studio
            </h1>
            <p className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">
              বাংলা ও ইংরেজি স্মার্ট সহকারী (Gemini 3.8 Flash)
            </p>
          </div>
        </div>

        {/* Mode pill */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${modeInfo.color}`}>
          <ModeIcon className="w-3.5 h-3.5" />
          <span>{modeInfo.label}</span>
        </div>

        {/* Active Session Title (auto-generated by AI) */}
        {activeSessionTitle && activeSessionTitle !== 'নতুন কথোপকথন' && (
          <div 
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border max-w-[270px] transition-colors ${
              isPinned
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700/60 shadow-xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200/80 dark:border-stone-700'
            }`}
            title={`সেশনের নাম: ${activeSessionTitle}${isPinned ? ' (পিন করা সেশন)' : ''}`}
          >
            {isGeneratingTitle ? (
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-spin shrink-0" />
            ) : isPinned ? (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{activeSessionTitle}</span>
            {onTogglePin && (
              <button
                type="button"
                onClick={onTogglePin}
                title={isPinned ? 'চ্যাটটি আনপিন করুন' : 'এই চ্যাটটি শীর্ষে পিন করুন'}
                className={`p-0.5 rounded-full transition-colors cursor-pointer shrink-0 ml-0.5 ${
                  isPinned
                    ? 'text-amber-600 hover:text-stone-500'
                    : 'text-stone-400 hover:text-amber-500'
                }`}
              >
                {isPinned ? (
                  <PinOff className="w-3 h-3" />
                ) : (
                  <Pin className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Google Search status */}
        {enableSearch && (
          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
            <Globe className="w-3 h-3 text-blue-500" />
            <span>Search Grounding Active</span>
          </div>
        )}
      </div>

      {/* Right: Persistent Quick Utilities (never clipped) */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          id="header-new-chat-btn"
          onClick={onNewChat}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs active:scale-95 cursor-pointer"
          title="নতুন চ্যাট শুরু করুন"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">নতুন চ্যাট</span>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton variant="header" />

        {/* Share & Export Dropdown Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="chat-top-export-btn"
            data-testid="chat-top-export-btn"
            onClick={() => setIsShareDropdownOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-xs ${
              isShareDropdownOpen
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20'
                : 'text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 border-stone-200 dark:border-stone-700'
            }`}
            title="চ্যাট লিঙ্ক সোশ্যাল মিডিয়ায় শেয়ার অথবা ফাইল এক্সপোর্ট করুন"
            aria-expanded={isShareDropdownOpen}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline font-semibold">
              {hasMessages ? 'শেয়ার ও এক্সপোর্ট' : 'শেয়ার করুন'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-stone-500 dark:text-stone-400 transition-transform duration-200 ${
                isShareDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Share & Export Dropdown Menu */}
          {isShareDropdownOpen && (
            <div
              id="share-export-dropdown-menu"
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-4"
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight">
                      {hasMessages ? 'সেশন শেয়ার ও এক্সপোর্ট' : 'স্টুডিও শেয়ার করুন'}
                    </h4>
                    <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate max-w-[200px]">
                      {shareTitle}
                    </p>
                  </div>
                </div>
                {copiedLink && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 animate-in fade-in">
                    <Check className="w-3 h-3" />
                    কপি হয়েছে!
                  </span>
                )}
              </div>

              {/* Copy Link to Clipboard Box */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                  <span>সেশন লিঙ্ক কপি করুন</span>
                  <span className="text-[10px] font-normal text-stone-500">সরাসরি লিঙ্ক</span>
                </label>
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-950/60">
                  <input
                    type="text"
                    readOnly
                    value={getShareUrl()}
                    className="flex-1 bg-transparent text-xs text-stone-700 dark:text-stone-300 px-2 py-1 outline-hidden select-all font-mono truncate"
                  />
                  <button
                    id="copy-share-link-btn"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 shadow-xs ${
                      copiedLink
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200'
                    }`}
                    title="ক্লিপবোর্ডে লিঙ্ক কপি করুন"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Social Media Sharing Grid */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block">
                  বিভিন্ন মিডিয়া প্ল্যাটফর্মে শেয়ার করুন
                </span>
                <div className="grid grid-cols-5 gap-2">
                  {/* WhatsApp */}
                  <button
                    id="share-whatsapp-btn"
                    onClick={() => handleSocialShare('whatsapp')}
                    className="group flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50 hover:bg-emerald-50 dark:bg-stone-800/50 dark:hover:bg-emerald-950/40 border border-stone-200/80 hover:border-emerald-300 dark:border-stone-700 dark:hover:border-emerald-700 transition-all text-center"
                    title="WhatsApp এ শেয়ার করুন"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.588-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.007c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.861.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      WhatsApp
                    </span>
                  </button>

                  {/* Facebook */}
                  <button
                    id="share-facebook-btn"
                    onClick={() => handleSocialShare('facebook')}
                    className="group flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50 hover:bg-blue-50 dark:bg-stone-800/50 dark:hover:bg-blue-950/40 border border-stone-200/80 hover:border-blue-300 dark:border-stone-700 dark:hover:border-blue-700 transition-all text-center"
                    title="Facebook এ শেয়ার করুন"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1877F2]/15 text-[#1877F2] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.82 0-1.666.17-2.12.597-.487.457-.604 1.18-.604 2.298v1.087h3.819l-.519 3.667h-3.3v7.98H9.101z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      Facebook
                    </span>
                  </button>

                  {/* X (Twitter) */}
                  <button
                    id="share-twitter-btn"
                    onClick={() => handleSocialShare('twitter')}
                    className="group flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/50 dark:hover:bg-stone-800 border border-stone-200/80 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600 transition-all text-center"
                    title="X (Twitter) এ পোস্ট করুন"
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-900/10 dark:bg-stone-100/10 text-stone-900 dark:text-stone-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                      X
                    </span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    id="share-linkedin-btn"
                    onClick={() => handleSocialShare('linkedin')}
                    className="group flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50 hover:bg-sky-50 dark:bg-stone-800/50 dark:hover:bg-sky-950/40 border border-stone-200/80 hover:border-sky-300 dark:border-stone-700 dark:hover:border-sky-700 transition-all text-center"
                    title="LinkedIn এ শেয়ার করুন"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#0A66C2]/15 text-[#0A66C2] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      LinkedIn
                    </span>
                  </button>

                  {/* Telegram */}
                  <button
                    id="share-telegram-btn"
                    onClick={() => handleSocialShare('telegram')}
                    className="group flex flex-col items-center gap-1 p-2 rounded-xl bg-stone-50 hover:bg-sky-50 dark:bg-stone-800/50 dark:hover:bg-sky-950/40 border border-stone-200/80 hover:border-sky-300 dark:border-stone-700 dark:hover:border-sky-700 transition-all text-center"
                    title="Telegram এ শেয়ার করুন"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#229ED9]/15 text-[#229ED9] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.197 1.006.128.828.936z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      Telegram
                    </span>
                  </button>
                </div>
              </div>

              {/* Open Complete Media Modal & QR Code Option */}
              {onOpenShareModal && (
                <button
                  id="open-full-share-modal-btn"
                  onClick={() => {
                    setIsShareDropdownOpen(false);
                    onOpenShareModal({
                      title: shareTitle,
                      text: shareText,
                      url: getShareUrl(),
                      sessionId: activeSessionId,
                      shareType: hasMessages ? 'session' : 'app',
                    });
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>সকল প্ল্যাটফর্ম ও QR কোড অপশন</span>
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                </button>
              )}

              {/* Device Native Share option if supported */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="native-device-share-btn"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>ডিভাইসের নেটিভ মেনু (সব অ্যাপ)</span>
                </button>
              )}

              {/* Export Chat File Action (PDF, JSON, Markdown) - if has messages */}
              {hasMessages && (
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                  <button
                    id="export-chat-modal-btn"
                    onClick={() => {
                      setIsShareDropdownOpen(false);
                      onExportChat();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>ফাইল হিসেবে ডাউনলোড (PDF / JSON / MD)</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dedicated Export Chat to PDF (Print-Friendly View) Button */}
        {onExportChatToPDF && (
          <button
            id="header-export-chat-pdf-btn"
            data-testid="header-export-chat-pdf-btn"
            type="button"
            onClick={onExportChatToPDF}
            disabled={!hasMessages}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-xs shrink-0 ${
              hasMessages
                ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 cursor-pointer active:scale-95'
                : 'bg-stone-100 dark:bg-stone-800/60 text-stone-400 dark:text-stone-600 border-stone-200/80 dark:border-stone-800 cursor-not-allowed opacity-60'
            }`}
            title={
              hasMessages
                ? 'Export Chat to PDF (প্রিন্ট-ফ্রেন্ডলি ভিউ ও PDF সেভ)'
                : 'PDF এক্সপোর্ট করতে আগে চ্যাটে কথোপকথন শুরু করুন'
            }
            aria-label="Export Chat to PDF"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline">Export Chat to PDF</span>
            <span className="hidden sm:inline xl:hidden">Export PDF</span>
          </button>
        )}

        {hasMessages && (
          <button
            id="clear-chat-btn"
            onClick={onClearChat}
            className="p-2 rounded-lg text-stone-500 hover:text-rose-600 dark:text-stone-400 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="চ্যাট হিস্টোরি মুছুন"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Google Drive Workspace button */}
        {onOpenGoogleDrive && (
          <button
            id="google-drive-header-btn"
            onClick={onOpenGoogleDrive}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/25 transition-all text-xs font-semibold cursor-pointer"
            title="Google Drive ক্লাউড ফাইল ম্যানেজার ও স্টোরেজ"
          >
            <HardDrive className="w-3.5 h-3.5 text-amber-500" />
            <span>Google Drive</span>
          </button>
        )}

        {/* Quick In-App Music / Video Player button */}
        <button
          onClick={() => {
            if (musicPlayer.currentTrack) {
              musicPlayer.expandPlayer();
            } else {
              musicPlayer.playTrack({
                videoId: 'jfKfPfyJRdk',
                title: 'Lofi Girl - Chill Beats to Code & Study To',
                originalUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
                searchQuery: 'Lofi Girl',
              });
            }
          }}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 transition-all text-xs font-semibold cursor-pointer"
          title="ইন-অ্যাপ ইউটিউব মিউজিক প্লেয়ার খুলুন"
        >
          <Youtube className="w-3.5 h-3.5 fill-current" />
          <span>মিউজিক প্লেয়ার</span>
        </button>

        {/* Universal Video & Image Media Studio Button */}
        {onOpenMediaStudio && (
          <button
            id="header-universal-media-btn"
            onClick={onOpenMediaStudio}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25 transition-all text-xs font-semibold cursor-pointer shrink-0"
            title="যেকোনো ভিডিও প্লেব্যাক ও যেকোনো ইমেজ জুম/ডাউনলোড স্টুডিও"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-500" />
            <span>মিডিয়া স্টুডিও</span>
          </button>
        )}

        {/* AI Picture Studio & Art Generator Button */}
        {onOpenPictureStudio && (
          <button
            id="header-picture-studio-btn"
            onClick={onOpenPictureStudio}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/25 transition-all text-xs font-semibold cursor-pointer shrink-0"
            title="AI ছবি তৈরি করুন ও সরাসরি ডাউনলোড করুন"
          >
            <Palette className="w-3.5 h-3.5 text-purple-500" />
            <span>AI ছবি স্টুডিও</span>
          </button>
        )}

        {/* Real-time Push & In-App Notification Center Bell */}
        {onOpenNotificationModal && (
          <button
            id="header-notification-center-btn"
            type="button"
            onClick={onOpenNotificationModal}
            className="relative p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
            title={`নোটিফিকেশন সেন্টার ${unreadCount > 0 ? `(${unreadCount}টি নতুন নোটিফিকেশন)` : ''}`}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center animate-pulse shadow-md">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}

        {/* Cloud Sync & Firebase User Auth */}
        <UserAuthButton onSyncAll={onSyncAll} onOpenProfile={onOpenFounderProfile} compact={true} />

        {onOpenTTSSettings && (
          <button
            id="header-quick-tts-settings-btn"
            type="button"
            onClick={onOpenTTSSettings}
            className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
            title="Text-to-Speech (TTS) ভয়েস গতি ও ভাষা সেটিংস প্যানেল"
            aria-label="Text-to-Speech সেটিংস প্যানেল"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}

        <button
          id="toggle-dark-mode-btn"
          onClick={() => setDarkMode((d: boolean) => !d)}
          className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          title={darkMode ? 'লাইট মোড' : 'ডার্ক মোড'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
      </div>

      {/* Horizontal Scrollable Top Programs Bar (Swipe / Scroll Left & Right) */}
      <div className="border-t border-stone-200/70 dark:border-stone-800/70 bg-stone-50/90 dark:bg-stone-950/75 px-2 sm:px-3 py-1">
        <HorizontalProgramScroller variant="header">
          {onOpenUniversalApps && (
            <button
              id="open-universal-apps-btn"
              onClick={() => onOpenUniversalApps('apps')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-950/60 dark:to-indigo-950/60 dark:hover:from-blue-900/60 dark:hover:to-indigo-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="সকল অ্যাপস ওপেন, জিমেইল, মেসেজিং ও GitHub কানেক্টর হাব"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>সকল অ্যাপস ও কানেক্ট</span>
            </button>
          )}

          {onOpenGitHubBusinessHub && (
            <button
              id="header-github-business-btn"
              type="button"
              onClick={onOpenGitHubBusinessHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              title="GitHub বিজনেস আইডিয়া, SMS ক্যাম্পেইন, অটো-Gmail প্রেরণ ও বিজনেস লার্নিং"
            >
              <Rocket className="w-3.5 h-3.5 text-emerald-100" />
              <span>GitHub বিজনেস ও অটো-Gmail</span>
            </button>
          )}

          {onOpenMobilePrograms && (
            <button
              id="mobile-header-programs-btn"
              type="button"
              onClick={onOpenMobilePrograms}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
              title="সকল প্রোগ্রাম ও টুলকিট খুলুন (Programs Hub)"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>প্রোগ্রাম হাব</span>
            </button>
          )}

          {onOpenDeveloperApi && (
            <button
              id="header-open-developer-api-btn"
              type="button"
              onClick={onOpenDeveloperApi}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              title="থার্ড-পার্টি ডেভেলপারদের জন্য API সার্ভিস, Key জেনারেটর ও রেট লিমিট ড্যাশবোর্ড"
            >
              <Key className="w-3.5 h-3.5 text-blue-200" />
              <span>API সার্ভিস (SaaS)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white/20 text-white uppercase font-black">
                PRO
              </span>
            </button>
          )}

          {onOpenShurukkhaHub && (
            <button
              id="open-shurukkha-hub-header-btn"
              onClick={onOpenShurukkhaHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              title="সুরক্ষা হাব ড্যাশবোর্ড (Shurukkha Hub — লাইভ সুরক্ষিত আইফ্রেম)"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-200 animate-pulse" />
              <span>সুরক্ষা হাব</span>
            </button>
          )}

          {onOpenPortfolioPwa && (
            <button
              id="header-portfolio-pwa-btn"
              type="button"
              onClick={onOpenPortfolioPwa}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-sky-600 to-indigo-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Sheikh Farid — Portfolio PWA (#projects)"
            >
              <Briefcase className="w-3.5 h-3.5 text-sky-200" />
              <span>Portfolio PWA</span>
            </button>
          )}

          {onOpenOmniSafeBrowser && (
            <button
              id="header-omnisafe-browser-btn"
              type="button"
              onClick={onOpenOmniSafeBrowser}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="OnionShield — OmniSafe Privacy Browser"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-violet-200" />
              <span>OnionShield ব্রাউজার</span>
            </button>
          )}

          {onOpenPaymentGatewayHub && (
            <button
              id="header-payment-gateway-hub-btn"
              type="button"
              onClick={onOpenPaymentGatewayHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-emerald-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Stripe & Gmail Payment Gateway Hub"
            >
              <CreditCard className="w-3.5 h-3.5 text-indigo-200" />
              <span>Stripe &amp; Gmail হাব</span>
            </button>
          )}

          {onOpenVideoAudioDownloader && (
            <button
              id="header-video-audio-downloader-btn"
              type="button"
              onClick={onOpenVideoAudioDownloader}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-rose-600 to-orange-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Universal Video & Audio Downloader"
            >
              <Download className="w-3.5 h-3.5 text-rose-100" />
              <span>Video/Audio ডাউনলোডার</span>
            </button>
          )}

          {onOpenPayHubDisbursement && (
            <button
              id="header-payhub-disbursement-btn"
              type="button"
              onClick={onOpenPayHubDisbursement}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="PayHub Gateway & Gmail Disbursement PWA"
            >
              <Wallet className="w-3.5 h-3.5 text-teal-100" />
              <span>PayHub ডিসবার্সমেন্ট</span>
            </button>
          )}

          {onOpenUaeVisaHub && (
            <button
              id="header-uae-visa-hub-btn"
              type="button"
              onClick={onOpenUaeVisaHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 via-sky-600 to-blue-700 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="UAE & Dubai Visa AI Hub"
            >
              <Plane className="w-3.5 h-3.5 text-amber-100" />
              <span>UAE Visa AI</span>
            </button>
          )}

          {onOpenApkEditorStudio && (
            <button
              id="header-apk-editor-studio-btn"
              type="button"
              onClick={onOpenApkEditorStudio}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-lime-500 via-emerald-600 to-cyan-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="APK Editor & Studio"
            >
              <Package className="w-3.5 h-3.5 text-lime-100" />
              <span>APK Editor Studio</span>
            </button>
          )}

          {onOpenPulseSms && (
            <button
              id="header-pulse-sms-btn"
              type="button"
              onClick={onOpenPulseSms}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 hover:brightness-110 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Pulse SMS — ওয়েব ও এআই মেসেজিং"
            >
              <MessagesSquare className="w-3.5 h-3.5 text-blue-100" />
              <span>Pulse SMS ওয়েব</span>
            </button>
          )}

          {onOpenShareReceiver && (
            <button
              id="header-open-share-receiver-btn"
              type="button"
              onClick={onOpenShareReceiver}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
              title="বহিরাগত প্ল্যাটফর্ম থেকে ফাইল, ছবি, লিংক ও লেখা আনুন (Universal Share Hub)"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>শেয়ার হাব</span>
            </button>
          )}

          {onOpenRubelNetManager && (
            <button
              id="header-open-rubelnet-btn"
              type="button"
              onClick={onOpenRubelNetManager}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-950/80 to-stone-900/90 hover:from-emerald-900/90 text-emerald-300 border border-emerald-500/40 shadow-2xs cursor-pointer transition-all whitespace-nowrap"
              title="RubelNet Firebase Manager 🛡️ — The Sovereign Grid for Firebase Command Center"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>RubelNet 🛡️</span>
            </button>
          )}

          <button
            id="header-open-music-player-btn"
            type="button"
            onClick={() => {
              if (musicPlayer.currentTrack) {
                musicPlayer.expandPlayer();
              } else {
                musicPlayer.playTrack({
                  videoId: 'maGEkZUFlKU',
                  title: 'Top 10 Rabindra Sangeet রবীন্দ্র সংগীত | রবিঠাকুরের সেরা গান',
                  originalUrl: 'https://www.youtube.com/watch?v=maGEkZUFlKU',
                });
              }
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 dark:from-red-950/60 dark:to-rose-950/60 dark:hover:from-red-900/60 dark:hover:to-rose-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
            title={isYouTubeConnected ? `${youtubeUser?.title || 'YouTube Channel'} (কানেক্টেড - প্লেয়ার খুলুন)` : 'ইউটিউব অটো-কন্টিনিউয়াস গান'}
          >
            {isYouTubeConnected && youtubeUser?.thumbnail ? (
              <img
                src={youtubeUser.thumbnail}
                alt="YouTube"
                className="w-4 h-4 rounded-full object-cover border border-red-500 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Youtube className="w-3.5 h-3.5 text-red-500 shrink-0" />
            )}
            <span>{isYouTubeConnected && youtubeUser?.title ? youtubeUser.title.split(' ')[0] : 'মিউজিক 🎵'}</span>
            {isYouTubeConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          </button>

          {onOpenMetrics && (
            <button
              id="open-metrics-btn"
              onClick={onOpenMetrics}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="Recharts চালিত চ্যাট ও প্রজেক্ট মেট্রিক্স অ্যানালিটিক্স ড্যাশবোর্ড"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>মেট্রিক্স ও গ্রাফ</span>
            </button>
          )}

          {onOpenFreelanceAgent && (
            <button
              id="open-freelance-agent-btn"
              onClick={onOpenFreelanceAgent}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="২৪/৭ রিমোট জব ও ফ্রিল্যান্স এআই এজেন্ট স্টুডিও"
            >
              <Bot className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>রিমোট জব এজেন্ট</span>
            </button>
          )}

          {onOpenCitizenServices && (
            <button
              id="open-citizen-services-btn"
              onClick={onOpenCitizenServices}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="মোবাইল নম্বর ডিরেক্টরি, ঠিকানা ও এ টু জেড জনসেবা কেন্দ্র"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>জনসেবা ও A-Z টুলকিট</span>
            </button>
          )}

          {onOpenGoogleDrive && (
            <button
              id="google-drive-header-btn"
              onClick={onOpenGoogleDrive}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/25 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap"
              title="Google Drive ক্লাউড ফাইল ম্যানেজার ও স্টোরেজ"
            >
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span>Google Drive</span>
            </button>
          )}

          {onOpenMediaStudio && (
            <button
              id="header-universal-media-btn"
              onClick={onOpenMediaStudio}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap"
              title="যেকোনো ভিডিও প্লেব্যাক ও যেকোনো ইমেজ জুম/ডাউনলোড স্টুডিও"
            >
              <Tv className="w-3.5 h-3.5 text-cyan-500" />
              <span>মিডিয়া স্টুডিও</span>
            </button>
          )}

          {onOpenPictureStudio && (
            <button
              id="header-picture-studio-btn"
              onClick={onOpenPictureStudio}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-500/25 transition-all text-xs font-semibold cursor-pointer whitespace-nowrap"
              title="AI ছবি তৈরি করুন ও সরাসরি ডাউনলোড করুন"
            >
              <Palette className="w-3.5 h-3.5 text-purple-500" />
              <span>AI ছবি স্টুডিও</span>
            </button>
          )}

          {onOpenEmailComposer && (
            <button
              id="open-email-composer-header-btn"
              onClick={onOpenEmailComposer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="প্রফেশনাল ইমেইল কম্পোজার ও ড্রাফটার (Email Composer & Exporter)"
            >
              <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>ইমেইল ড্রাফটার</span>
            </button>
          )}

          {onOpenEmailTemplatesLibrary && (
            <button
              id="header-email-templates-btn"
              type="button"
              onClick={onOpenEmailTemplatesLibrary}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="ইমেইল টেমপ্লেট লাইব্রেরি (Marketing, Collaboration, Follow-up)"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>টেমপ্লেট লাইব্রেরি</span>
            </button>
          )}

          <button
            id="header-mini-google-browser-btn"
            type="button"
            onClick={() => {
              const query = activeSessionTitle && activeSessionTitle !== 'নতুন কথোপকথন'
                ? activeSessionTitle
                : '';
              miniBrowser.openBrowser(query, 'search', {
                sessionTitle: activeSessionTitle,
              });
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 border border-blue-300 dark:border-blue-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            title="মিনি গুগল ব্রাউজার খুলুন (লাইভ ওয়েব সার্চ, ইউটিউব, গুগল রিসোর্স)"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>মিনি ব্রাউজার</span>
          </button>

          {onOpenFounderProfile && (
            <button
              id="open-founder-profile-header-btn"
              onClick={onOpenFounderProfile}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 dark:from-amber-950/70 dark:to-amber-900/60 dark:hover:from-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/80 transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
              title="স্মার্ট ডিজিটাল প্রোফাইল আইডি কার্ড দেখুন ও তৈরি/আপডেট করুন (Sheikh Farid - Super Admin)"
            >
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>প্রোফাইল আইডি</span>
            </button>
          )}

          <button
            id="open-architecture-guide-btn"
            onClick={onOpenArchitecture}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
            title="নিজস্ব AI অ্যাপ কীভাবে বানাবেন তার বিস্তারিত রোডম্যাপ"
          >
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>AI আর্কিটেকচার</span>
          </button>

          {onOpenHostingDiagnostic && (
            <button
              id="open-hosting-diagnostic-btn"
              onClick={onOpenHostingDiagnostic}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="হোস্টিং ও জেমিনি এআই ডায়াগনস্টিক"
            >
              <Server className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>এআই স্ট্যাটাস</span>
            </button>
          )}

          {onOpenTTSSettings && (
            <button
              id="open-tts-settings-header-btn"
              onClick={onOpenTTSSettings}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs cursor-pointer whitespace-nowrap"
              title="Text-to-Speech (TTS) কণ্ঠস্বরের গতি ও ভাষা সেটিংস প্যানেল"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>TTS সেটিংস</span>
            </button>
          )}
        </HorizontalProgramScroller>
      </div>
    </header>
  );
};
