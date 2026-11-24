import React, { useState } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Download,
  Layers, 
  Code2, 
  PenTool, 
  Search, 
  GraduationCap, 
  Compass, 
  Sparkles,
  X,
  Server,
  Cpu,
  Cloud,
  LogIn,
  Share2,
  Shield,
  ShieldCheck,
  Bot,
  HardDrive,
  Music,
  Globe,
  CheckCircle2,
  ChevronRight,
  Filter,
  Volume2,
  Gauge,
  Crown,
  Pin,
  PinOff,
  Mail,
  FolderGit2,
  Users,
  BarChart3,
  TrendingUp,
  Youtube,
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
  BookMarked
} from 'lucide-react';
import { ChatSession, AssistantMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { AppLogo } from './AppLogo';
import { useAuth } from '../context/AuthContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { useMiniBrowser } from '../context/MiniBrowserContext';
import { useNotifications } from '../context/NotificationContext';
import { UniversalTab } from './UniversalAppsConnectModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onExportSession?: (session: ChatSession, e: React.MouseEvent) => void;
  onTogglePinSession?: (id: string, e: React.MouseEvent) => void;
  onOpenArchitecture: () => void;
  onOpenHostingDiagnostic?: () => void;
  onOpenCitizenServices?: () => void;
  onOpenShurukkhaHub?: () => void;
  onOpenPortfolioPwa?: () => void;
  onOpenOmniSafeBrowser?: () => void;
  onOpenPaymentGatewayHub?: () => void;
  onOpenVideoAudioDownloader?: () => void;
  onOpenPayHubDisbursement?: () => void;
  onOpenUaeVisaHub?: () => void;
  onOpenApkEditorStudio?: () => void;
  onOpenPulseSms?: () => void;
  onOpenGitHubBusinessHub?: () => void;
  onOpenFreelanceAgent?: () => void;
  onOpenUniversalApps?: (tab?: UniversalTab) => void;
  onOpenMetrics?: () => void;
  onOpenGoogleDrive?: () => void;
  onOpenTTSSettings?: () => void;
  onOpenFounderProfile?: () => void;
  onOpenEmailComposer?: () => void;
  onOpenEmailTemplatesLibrary?: () => void;
  onOpenShare?: (config?: { shareType?: 'app' | 'session' }) => void;
  onOpenShareReceiver?: () => void;
  onOpenRubelNetManager?: () => void;
  onOpenYouTubeAuth?: () => void;
  onOpenDeveloperApi?: () => void;
  onOpenNotificationModal?: () => void;
  onOpenMediaStudio?: () => void;
  onOpenPictureStudio?: () => void;
  onSelectMode: (mode: AssistantMode) => void;
  currentMode: AssistantMode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onExportSession,
  onTogglePinSession,
  onOpenArchitecture,
  onOpenHostingDiagnostic,
  onOpenCitizenServices,
  onOpenShurukkhaHub,
  onOpenPortfolioPwa,
  onOpenOmniSafeBrowser,
  onOpenPaymentGatewayHub,
  onOpenVideoAudioDownloader,
  onOpenPayHubDisbursement,
  onOpenUaeVisaHub,
  onOpenApkEditorStudio,
  onOpenPulseSms,
  onOpenGitHubBusinessHub,
  onOpenFreelanceAgent,
  onOpenUniversalApps,
  onOpenMetrics,
  onOpenGoogleDrive,
  onOpenTTSSettings,
  onOpenFounderProfile,
  onOpenEmailComposer,
  onOpenEmailTemplatesLibrary,
  onOpenShare,
  onOpenShareReceiver,
  onOpenRubelNetManager,
  onOpenYouTubeAuth,
  onOpenDeveloperApi,
  onOpenNotificationModal,
  onOpenMediaStudio,
  onOpenPictureStudio,
  onSelectMode,
  currentMode,
}) => {
  const { user, signIn, isYouTubeConnected, youtubeUser } = useAuth();
  const musicPlayer = useMusicPlayer();
  const miniBrowser = useMiniBrowser();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<'programs' | 'history'>('programs');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const trimmedSearchQuery = historySearchQuery.trim().toLowerCase();

  const filteredSessions = sessions.filter((s) => {
    if (!trimmedSearchQuery) return true;
    const titleMatch = (s.title || '').toLowerCase().includes(trimmedSearchQuery);
    const messageMatch = s.messages.some(
      (m) =>
        (m.text || '').toLowerCase().includes(trimmedSearchQuery) ||
        (m.generatedImage?.prompt || '').toLowerCase().includes(trimmedSearchQuery)
    );
    return titleMatch || messageMatch;
  });

  const handleSearchQueryChange = (val: string) => {
    setHistorySearchQuery(val);
    if (val.trim() && activeTab !== 'history') {
      setActiveTab('history');
    }
  };

  const getMatchingSnippet = (s: ChatSession): string | null => {
    if (!trimmedSearchQuery) return null;
    const matchedMsg = s.messages.find(
      (m) =>
        (m.text || '').toLowerCase().includes(trimmedSearchQuery) ||
        (m.generatedImage?.prompt || '').toLowerCase().includes(trimmedSearchQuery)
    );
    if (!matchedMsg) return null;
    const content = (matchedMsg.text || matchedMsg.generatedImage?.prompt || '').replace(/\s+/g, ' ').trim();
    const idx = content.toLowerCase().indexOf(trimmedSearchQuery);
    if (idx === -1) return content.slice(0, 60);
    const start = Math.max(0, idx - 18);
    const end = Math.min(content.length, idx + trimmedSearchQuery.length + 34);
    return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
  };

  const pinnedSessions = filteredSessions
    .filter((s) => s.isPinned)
    .sort((a, b) => (b.pinnedAt || b.updatedAt) - (a.pinnedAt || a.updatedAt));

  const unpinnedSessions = filteredSessions
    .filter((s) => !s.isPinned)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const renderSessionItem = (s: ChatSession) => {
    const isActive = s.id === activeSessionId;
    const isPinned = Boolean(s.isPinned);
    const matchSnippet = getMatchingSnippet(s);

    return (
      <div
        key={s.id}
        id={`sidebar-session-${s.id}`}
        onClick={() => {
          onSelectSession(s.id);
          if (window.innerWidth < 768) onClose();
        }}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
          isActive
            ? isPinned
              ? 'bg-amber-100/90 dark:bg-amber-950/80 font-semibold text-amber-950 dark:text-amber-100 shadow-xs border border-amber-400 dark:border-amber-600'
              : 'bg-white dark:bg-stone-800 font-semibold text-stone-900 dark:text-stone-100 shadow-xs border border-stone-300 dark:border-stone-700'
            : isPinned
            ? 'bg-amber-50/60 dark:bg-amber-950/30 text-stone-800 dark:text-stone-200 border border-amber-200/70 dark:border-amber-900/50 hover:bg-amber-100/60 dark:hover:bg-amber-900/40'
            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/60 dark:hover:bg-stone-800/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          {isPinned ? (
            <Pin className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-amber-500" />
          ) : (
            <MessageSquare
              className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-stone-400'}`}
            />
          )}
          <div className="min-w-0">
            <span className="truncate block font-medium">
              {s.title || 'নতুন কথোপকথন'}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-normal">
              <span>{s.messages.length}টি বার্তা</span>
              {isPinned && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">• পিন করা</span>
              )}
            </div>
            {matchSnippet && (
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400/90 truncate mt-0.5 font-normal">
                {matchSnippet}
              </p>
            )}
          </div>
          {s.isGeneratingTitle && (
            <span title="শিরোনাম তৈরি হচ্ছে..." className="shrink-0 inline-flex items-center">
              <Sparkles className="w-3 h-3 text-emerald-500 animate-spin" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {onTogglePinSession && (
            <button
              id={`sidebar-pin-btn-${s.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePinSession(s.id, e);
              }}
              title={isPinned ? 'চ্যাট আনপিন করুন' : 'শীর্ষে পিন করুন'}
              className={`p-1 rounded transition-colors cursor-pointer ${
                isPinned
                  ? 'text-amber-600 hover:text-stone-400 bg-amber-500/10'
                  : 'text-stone-400 hover:text-amber-500 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}

          {s.messages.length > 0 && onExportSession && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExportSession(s, e);
              }}
              title="PDF বা JSON এক্সপোর্ট"
              className="p-1 text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSession(s.id, e);
            }}
            title="মুছে ফেলুন"
            className="p-1 text-stone-400 hover:text-rose-500 hover:bg-stone-200 dark:hover:bg-stone-700 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const modesList: Array<{ id: AssistantMode; label: string; desc: string; icon: any; color: string }> = [
    { id: 'citizen', label: 'জনসেবা ও A-Z সমাধান', desc: 'হটলাইন, ঠিকানা, এনআইডি ও দরখাস্ত', icon: ShieldCheck, color: 'text-teal-600 dark:text-teal-400' },
    { id: 'coding', label: 'কোডিং ও ডেভেলপমেন্ট', desc: 'Python, JS, React, AI কোড জেনারেটর', icon: Code2, color: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'writing', label: 'লেখালেখি ও অনুবাদ', desc: 'অফিসিয়াল দরখাস্ত, জিডি, ইমেইল, অনুচ্ছেদ', icon: PenTool, color: 'text-amber-600 dark:text-amber-400' },
    { id: 'research', label: 'গবেষণা ও ফ্যাক্ট-চেক', desc: 'Google Search লাইভ ডাটা ভেরিফিকেশন', icon: Search, color: 'text-blue-600 dark:text-blue-400' },
    { id: 'learning', label: 'পড়াশোনা ও কনসেপ্ট', desc: 'সহজ ভাষায় জটিল বিষয়ের ব্যাখ্যা', icon: GraduationCap, color: 'text-purple-600 dark:text-purple-400' },
    { id: 'general', label: 'সাধারণ মোড (General)', desc: 'দৈনন্দিন সকল কাজের স্মার্ট উত্তর', icon: Sparkles, color: 'text-stone-600 dark:text-stone-400' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in"
        />
      )}

      {/* Sidebar container */}
      <aside
        id="app-sidebar"
        className={`fixed md:static inset-y-0 left-0 z-50 w-[85vw] max-w-xs sm:w-80 md:w-80 bg-stone-50 dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        } shrink-0`}
      >
        {/* Brand Banner */}
        <div className="p-3.5 border-b border-stone-200/80 dark:border-stone-800/80 flex items-center justify-between bg-white dark:bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <AppLogo size={32} withGlow={true} />
            <div>
              <span className="text-xs font-black text-stone-900 dark:text-stone-100 tracking-tight leading-none block">
                AI Assistant Studio
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gemini 3.8 Flash • ক্লাউড রেডি
              </span>
            </div>
          </div>
          <button
            id="sidebar-close-btn"
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 md:hidden rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="সাইডবার বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Primary Action Button & Top Chat Search Bar */}
        <div className="p-3 pb-2 border-b border-stone-200/70 dark:border-stone-800/70 shrink-0 bg-stone-100/50 dark:bg-stone-900/50 space-y-2">
          <button
            id="sidebar-new-chat-btn"
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-sm transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            <span>নতুন কথোপকথন (New Chat)</span>
          </button>

          {/* Persistent Top Search Bar for Saved ChatSessions */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              id="sidebar-session-search-input"
              type="search"
              aria-label="সংরক্ষিত চ্যাট শিরোনাম বা কীওয়ার্ড দিয়ে খুঁজুন"
              value={historySearchQuery}
              onChange={(e) => handleSearchQueryChange(e.target.value)}
              placeholder="চ্যাট শিরোনাম বা কীওয়ার্ড খুঁজুন..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus:outline-hidden focus:border-emerald-500 text-stone-900 dark:text-stone-100 placeholder:text-stone-400"
            />
            {historySearchQuery && (
              <button
                id="sidebar-session-search-clear-btn"
                type="button"
                onClick={() => setHistorySearchQuery('')}
                title="অনুসন্ধান মুছুন"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Top Segmented Tab Switcher (Programs vs History) */}
        <div className="px-3 pt-2 pb-1 shrink-0 bg-stone-100/40 dark:bg-stone-900/40">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-stone-200/80 dark:bg-stone-800 text-xs font-semibold">
            <button
              type="button"
              id="sidebar-tab-programs"
              onClick={() => setActiveTab('programs')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'programs'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>সকল প্রোগ্রাম</span>
            </button>

            <button
              type="button"
              id="sidebar-tab-history"
              onClick={() => setActiveTab('history')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>
                চ্যাট হিস্ট্রি ({trimmedSearchQuery ? `${filteredSessions.length}/${sessions.length}` : sessions.length})
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Body: Contains either all programs or chat history */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3.5 text-xs">
          {activeTab === 'programs' ? (
            /* =================== TAB 1: ALL PROGRAMS & TOOLS =================== */
            <div className="space-y-3">
              {/* Category 1: AI Agents & Specialized Toolkits */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1 mb-1.5 flex items-center gap-1">
                  <span>⚡ এআই প্রোগ্রাম ও টুলকিট</span>
                </p>
                <div className="space-y-1.5">
                  {/* Universal Inbound Share Hub (Receive Files, Photos, Links, Notes) */}
                  {onOpenShareReceiver && (
                    <button
                      id="sidebar-prog-share-receiver"
                      onClick={() => {
                        onOpenShareReceiver();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent hover:from-emerald-500/25 border border-emerald-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              বহিরাগত শেয়ার হাব (ইনপুট)
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase">
                              New
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                            ফাইল, ফটো, সোশ্যাল লিংক ও লেখা আনুন
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* RubelNet Firebase Manager Sovereign Grid */}
                  {onOpenRubelNetManager && (
                    <button
                      id="sidebar-prog-rubelnet-manager"
                      onClick={() => {
                        onOpenRubelNetManager();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-stone-900 border border-emerald-500/40 text-left transition-all group cursor-pointer shadow-2xs hover:border-emerald-400"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-white truncate">
                              RubelNet Firebase Manager
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-stone-950 uppercase">
                              Grid 🛡️
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-400 truncate">
                            The Sovereign Grid for Firebase
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Universal Apps, Gmail & Messaging Hub */}
                  {onOpenUniversalApps && (
                    <button
                      id="sidebar-prog-universal-apps"
                      onClick={() => {
                        onOpenUniversalApps('apps');
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-transparent hover:from-blue-500/25 border border-blue-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              সকল অ্যাপস, জিমেইল ও মেসেজ
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-500 text-white uppercase">
                              Hub
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-700 dark:text-blue-400 truncate">
                            Gmail, WhatsApp, SMS, Drive, Maps ওপেন
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Professional Email Composer & Drafter */}
                  {onOpenEmailComposer && (
                    <button
                      id="sidebar-prog-email-composer"
                      onClick={() => {
                        onOpenEmailComposer();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-transparent hover:from-teal-500/25 border border-teal-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              প্রফেশনাল ইমেইল কম্পোজার
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-teal-600 text-white uppercase">
                              Draft
                            </span>
                          </div>
                          <p className="text-[10px] text-teal-700 dark:text-teal-400 truncate">
                            বাংলা ও ইংরেজিতে ড্রাফট, এক্সপোর্ট ও কপি
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Email Templates Library */}
                  {onOpenEmailTemplatesLibrary && (
                    <button
                      id="sidebar-email-templates-btn"
                      onClick={() => {
                        onOpenEmailTemplatesLibrary();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent hover:from-amber-500/25 border border-amber-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <BookMarked className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              ইমেইল টেমপ্লেট লাইব্রেরি
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-600 text-white uppercase">
                              Library
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                            Marketing, Collaboration ও Follow-up
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* GitHub Business, Marketing & Auto-Gmail Studio */}
                  {onOpenGitHubBusinessHub && (
                    <button
                      id="sidebar-github-business-btn"
                      onClick={() => {
                        onOpenGitHubBusinessHub();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-indigo-500/15 hover:from-emerald-500/25 hover:to-indigo-500/25 border border-emerald-500/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Rocket className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              GitHub বিজনেস ও অটো-Gmail
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase">
                              AI Growth
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                            বিজনেস আইডিয়া, SMS, সরাসরি Gmail ও মার্কেটিং
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* GitHub Flagship Hub (rsk934128-dot) */}
                  {onOpenUniversalApps && (
                    <button
                      id="sidebar-prog-github-hub"
                      onClick={() => {
                        onOpenUniversalApps('github');
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50/90 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 border border-purple-300/60 dark:border-purple-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <FolderGit2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-purple-950 dark:text-purple-200 truncate">
                            GitHub হাব (rsk934128-dot)
                          </p>
                          <p className="text-[10px] text-purple-700/90 dark:text-purple-400/90 truncate">
                            শেখ ফরিদের ১৩৯+ রিপোজিটরি ও কোডিং
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* People Connect & Networking Directory */}
                  {onOpenUniversalApps && (
                    <button
                      id="sidebar-prog-people-hub"
                      onClick={() => {
                        onOpenUniversalApps('people');
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-300/60 dark:border-indigo-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate">
                            মানুষের সাথে কানেক্ট ও কন্টাক্ট বুক
                          </p>
                          <p className="text-[10px] text-indigo-700/90 dark:text-indigo-400/90 truncate">
                            ১-ক্লিক কল, WhatsApp, জিমেইল ও কন্টাক্টস
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* ForTrade Pro Trading Terminal (PWA) */}
                  <button
                    id="sidebar-prog-fortrade-terminal"
                    onClick={() => {
                      miniBrowser.openBrowser('https://fortrade-pro-trading-terminal-dev-d-nine.vercel.app/?source=pwa', 'web');
                      if (window.innerWidth < 768) onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent hover:from-emerald-500/25 border border-emerald-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                            ForTrade Pro ট্রেডিং টার্মিনাল
                          </p>
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase">
                            PWA
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                          লাইভ ফরেক্স, স্টক ও ক্রিপ্টো ট্রেডিং চার্ট
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Freelance Agent */}
                  {onOpenFreelanceAgent && (
                    <button
                      id="sidebar-prog-freelance-agent"
                      onClick={() => {
                        onOpenFreelanceAgent();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent hover:from-emerald-500/20 border border-emerald-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              ২৪/৭ রিমোট জব এআই এজেন্ট
                            </p>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                            Upwork/Remote জব মূল্যায়ন ও প্রপোজাল
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Developer API SaaS Platform */}
                  {onOpenDeveloperApi && (
                    <button
                      id="sidebar-prog-developer-api"
                      onClick={() => {
                        onOpenDeveloperApi();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 hover:from-blue-100 hover:to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40 dark:hover:from-blue-950/70 dark:hover:to-indigo-950/70 border border-blue-200/80 dark:border-blue-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Key className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-blue-950 dark:text-blue-200 truncate">
                              ডেভেলপার API সার্ভিস (SaaS)
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white uppercase">
                              API
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-700/90 dark:text-blue-400/90 truncate">
                            API Key, রেট লিমিট ও থার্ড-পার্টি ডক্স
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Citizen Services */}
                  {onOpenCitizenServices && (
                    <button
                      id="sidebar-prog-citizen"
                      onClick={() => {
                        onOpenCitizenServices();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-teal-50/90 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-950/70 border border-teal-200/80 dark:border-teal-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-teal-950 dark:text-teal-200 truncate">
                            A-Z জনসেবা ও তথ্য নির্দেশিকা
                          </p>
                          <p className="text-[10px] text-teal-700/90 dark:text-teal-400/90 truncate">
                            হটলাইন, ঠিকানা, এনআইডি ও দরখাস্ত
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Google Drive Workspace */}
                  {onOpenGoogleDrive && (
                    <button
                      id="sidebar-prog-drive"
                      onClick={() => {
                        onOpenGoogleDrive();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50/90 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-300/60 dark:border-amber-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <HardDrive className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate">
                            Google Drive ক্লাউড স্টুডিও
                          </p>
                          <p className="text-[10px] text-amber-700/90 dark:text-amber-400/90 truncate">
                            ফাইল ইম্পোর্ট ও সোর্স কোড বিশ্লেষণ
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Recharts Data Visualization & Metrics Dashboard */}
                  {onOpenMetrics && (
                    <button
                      id="sidebar-prog-metrics"
                      onClick={() => {
                        onOpenMetrics();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              মেট্রিক্স ও অ্যানালিটিক্স
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-500 text-white uppercase">
                              Charts
                            </span>
                          </div>
                          <p className="text-[10px] text-indigo-700/90 dark:text-indigo-400/90 truncate">
                            চ্যাট গ্রাফ, গিটহাব ও পারফরম্যান্স ডেটা
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Push & In-App Notification Center */}
                  {onOpenNotificationModal && (
                    <button
                      id="sidebar-prog-notifications"
                      onClick={() => {
                        onOpenNotificationModal();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/30 dark:hover:bg-amber-950/60 border border-amber-300/50 dark:border-amber-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Bell className="w-4 h-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-stone-900 animate-pulse">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate">
                              নোটিফিকেশন ও অ্যালার্ট হাব
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white uppercase">
                              Push
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700/90 dark:text-amber-400/90 truncate">
                            পুশ নোটিফিকেশন, রিমাইন্ডার ও চিম সাউন্ড
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Universal Media Player & Image Studio */}
                  {onOpenMediaStudio && (
                    <button
                      id="sidebar-prog-media-studio"
                      onClick={() => {
                        onOpenMediaStudio();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-cyan-50/80 hover:bg-cyan-100/90 dark:bg-cyan-950/30 dark:hover:bg-cyan-950/60 border border-cyan-300/50 dark:border-cyan-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-cyan-950 dark:text-cyan-200 truncate">
                              মিডিয়া প্লেয়ার ও ইমেজ স্টুডিও
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-600 text-white uppercase">
                              Media
                            </span>
                          </div>
                          <p className="text-[10px] text-cyan-700/90 dark:text-cyan-400/90 truncate">
                            যেকোনো ভিডিও প্লেব্যাক ও ইমেজ ভিউয়ার
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* AI Picture Studio & Art Generator */}
                  {onOpenPictureStudio && (
                    <button
                      id="sidebar-prog-picture-studio"
                      onClick={() => {
                        onOpenPictureStudio();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 hover:bg-purple-100/90 dark:bg-purple-950/30 dark:hover:bg-purple-950/60 border border-purple-300/50 dark:border-purple-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-purple-950 dark:text-purple-200 truncate">
                              AI ছবি ও আর্ট স্টুডিও
                            </p>
                            <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-purple-600 text-white uppercase">
                              Image AI
                            </span>
                          </div>
                          <p className="text-[10px] text-purple-700/90 dark:text-purple-400/90 truncate">
                            সুন্দর ছবি তৈরি ও তাৎক্ষণিক ডাউনলোড
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Architecture Blueprint */}
                  <button
                    id="sidebar-prog-architecture"
                    onClick={() => {
                      onOpenArchitecture();
                      if (window.innerWidth < 768) onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800/80 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-stone-800 dark:bg-stone-700 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          AI আর্কিটেকচার ব্লুপ্রিন্ট
                        </p>
                        <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                          Claude ও ChatGPT-এর মতো অ্যাপ বানানোর গাইড
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-stone-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Hosting & AI Diagnostics */}
                  {onOpenHostingDiagnostic && (
                    <button
                      id="sidebar-prog-hosting"
                      onClick={() => {
                        onOpenHostingDiagnostic();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 border border-emerald-300/50 dark:border-emerald-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Server className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                            হোস্টিং ও সার্ভার ডায়াগনস্টিক
                          </p>
                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                            এআই API হেলথ চেক ও কোটা সমাধান
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* YouTube Music Studio */}
                  <button
                    id="sidebar-prog-youtube-music"
                    onClick={() => {
                      if (musicPlayer.currentTrack) {
                        musicPlayer.expandPlayer();
                      } else {
                        musicPlayer.playVideoId('maGEkZUFlKU', 'Top 10 Rabindra Sangeet রবীন্দ্র সংগীত | রবিঠাকুরের সেরা গান');
                      }
                      if (window.innerWidth < 768) onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/30 dark:hover:bg-red-950/60 border border-red-300/50 dark:border-red-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-red-950 dark:text-red-200 truncate">
                            ইউটিউব অটো-কন্টিনিউয়াস গান 🎵
                          </p>
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
                            Auto
                          </span>
                        </div>
                        <p className="text-[10px] text-red-700/80 dark:text-red-400/80 truncate">
                          একের পর এক গান, সময় অনুযায়ী আপডেট ও হিস্ট্রি
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* YouTube Authentication & Personal Channel Hub */}
                  {onOpenYouTubeAuth && (
                    <button
                      id="sidebar-prog-youtube-auth"
                      onClick={() => {
                        onOpenYouTubeAuth();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-red-600/15 via-rose-500/10 to-transparent hover:from-red-600/25 border border-red-500/30 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Youtube className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                              ইউটিউব অথেন্টিকেশন ও চ্যানেল
                            </p>
                            {isYouTubeConnected ? (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white uppercase">
                                কানেক্টেড 🟢
                              </span>
                            ) : (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-red-600 text-white uppercase">
                                লগইন
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-red-700 dark:text-red-400 truncate">
                            {isYouTubeConnected && youtubeUser?.title
                              ? `${youtubeUser.title} • প্লেলিস্ট ও চ্যানেল`
                              : 'গুগল অ্যাকাউন্টে সাইন-ইন ও নিজস্ব প্লেলিস্ট'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Shurukkha Hub Dashboard */}
                  {onOpenShurukkhaHub && (
                    <button
                      id="sidebar-prog-shurukkha-hub"
                      onClick={() => {
                        onOpenShurukkhaHub();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-cyan-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 dark:from-emerald-950/40 dark:to-cyan-950/40 border border-emerald-400/40 dark:border-emerald-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-cyan-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                              সুরক্ষা হাব ড্যাশবোর্ড
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white animate-pulse">
                              LIVE
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                            ইমার্জেন্সি SOS ও নাগরিক সুরক্ষা হাব
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Sheikh Farid Portfolio PWA & Projects */}
                  {onOpenPortfolioPwa && (
                    <button
                      id="sidebar-prog-portfolio-pwa"
                      onClick={() => {
                        onOpenPortfolioPwa();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 hover:from-sky-500/25 hover:to-indigo-500/25 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-400/40 dark:border-sky-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Briefcase className="w-4 h-4 text-sky-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-sky-950 dark:text-sky-200 truncate">
                              Portfolio PWA ও প্রজেক্টস
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-600 text-white">
                              #projects
                            </span>
                          </div>
                          <p className="text-[10px] text-sky-700 dark:text-sky-400 truncate">
                            শেখ ফরিদের পোর্টফোলিও ও প্রজেক্ট শোকেস
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* OnionShield — OmniSafe Privacy Browser */}
                  {onOpenOmniSafeBrowser && (
                    <button
                      id="sidebar-prog-omnisafe-browser"
                      onClick={() => {
                        onOpenOmniSafeBrowser();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-indigo-500/15 hover:from-violet-500/25 hover:to-indigo-500/25 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-400/40 dark:border-violet-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <ShieldAlert className="w-4 h-4 text-violet-200" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-violet-950 dark:text-violet-200 truncate">
                              OnionShield প্রাইভেসি ব্রাউজার
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-violet-600 text-white">
                              APK
                            </span>
                          </div>
                          <p className="text-[10px] text-violet-700 dark:text-violet-400 truncate">
                            OmniSafe • ট্র্যাকার ব্লক ও প্রাইভেসি অডিট
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Stripe & Gmail Payment Gateway Hub */}
                  {onOpenPaymentGatewayHub && (
                    <button
                      id="sidebar-prog-payment-gateway-hub"
                      onClick={() => {
                        onOpenPaymentGatewayHub();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-emerald-500/15 hover:from-indigo-500/25 hover:to-emerald-500/25 dark:from-indigo-950/40 dark:to-emerald-950/40 border border-indigo-400/40 dark:border-indigo-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <CreditCard className="w-4 h-4 text-indigo-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 truncate">
                              Stripe &amp; Gmail পেমেন্ট হাব
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-600 text-white">
                              PAY
                            </span>
                          </div>
                          <p className="text-[10px] text-indigo-700 dark:text-indigo-400 truncate">
                            পেমেন্ট সিমুলেটর, ওয়েবহুক ও রিসিট হাব
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Universal Video & Audio Downloader */}
                  {onOpenVideoAudioDownloader && (
                    <button
                      id="sidebar-prog-video-audio-downloader"
                      onClick={() => {
                        onOpenVideoAudioDownloader();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-orange-500/15 hover:from-rose-500/25 hover:to-orange-500/25 dark:from-rose-950/40 dark:to-orange-950/40 border border-rose-400/40 dark:border-rose-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-600 to-orange-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Download className="w-4 h-4 text-rose-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-rose-950 dark:text-rose-200 truncate">
                              Video &amp; Audio ডাউনলোডার
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-600 text-white">
                              MP3/4
                            </span>
                          </div>
                          <p className="text-[10px] text-rose-700 dark:text-rose-400 truncate">
                            YouTube, FB, IG • HD MP4 ও অডিও
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* PayHub Gateway & Gmail Disbursement PWA */}
                  {onOpenPayHubDisbursement && (
                    <button
                      id="sidebar-prog-payhub-disbursement"
                      onClick={() => {
                        onOpenPayHubDisbursement();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-cyan-500/15 hover:from-teal-500/25 hover:to-cyan-500/25 dark:from-teal-950/40 dark:to-cyan-950/40 border border-teal-400/40 dark:border-teal-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Wallet className="w-4 h-4 text-teal-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-teal-950 dark:text-teal-200 truncate">
                              PayHub ডিসবার্সমেন্ট PWA
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-teal-600 text-white">
                              B2C
                            </span>
                          </div>
                          <p className="text-[10px] text-teal-700 dark:text-teal-400 truncate">
                            Stripe, bKash, Nagad ও জিমেইল রিসিট
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* UAE & Dubai Visa AI Hub */}
                  {onOpenUaeVisaHub && (
                    <button
                      id="sidebar-prog-uae-visa-hub"
                      onClick={() => {
                        onOpenUaeVisaHub();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-sky-500/10 to-blue-500/15 hover:from-amber-500/25 hover:to-blue-500/25 dark:from-amber-950/40 dark:to-sky-950/40 border border-amber-400/40 dark:border-amber-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-sky-600 to-blue-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Plane className="w-4 h-4 text-amber-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate">
                              UAE &amp; Dubai Visa AI Hub
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-600 text-white">
                              OCR
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 truncate">
                            পাসপোর্ট OCR, ফটো ও ভিসা অডিট
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* APK Editor & Studio */}
                  {onOpenApkEditorStudio && (
                    <button
                      id="sidebar-prog-apk-editor-studio"
                      onClick={() => {
                        onOpenApkEditorStudio();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-lime-500/15 via-emerald-500/10 to-cyan-500/15 hover:from-lime-500/25 hover:to-cyan-500/25 dark:from-lime-950/40 dark:to-emerald-950/40 border border-lime-400/40 dark:border-lime-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-lime-500 via-emerald-600 to-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Package className="w-4 h-4 text-lime-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-lime-950 dark:text-lime-200 truncate">
                              APK Editor &amp; Studio
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-600 text-white">
                              APK
                            </span>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">
                            Smali/XML এডিটর ও Keystore সাইনিং
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Pulse SMS Web Companion */}
                  {onOpenPulseSms && (
                    <button
                      id="sidebar-prog-pulse-sms"
                      onClick={() => {
                        onOpenPulseSms();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-indigo-500/15 hover:from-blue-500/25 hover:to-indigo-500/25 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-400/40 dark:border-blue-600/40 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <MessagesSquare className="w-4 h-4 text-blue-100" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-blue-950 dark:text-blue-200 truncate">
                              Pulse SMS (ওয়েব)
                            </p>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-blue-600 text-white">
                              SMS
                            </span>
                          </div>
                          <p className="text-[10px] text-blue-700 dark:text-blue-400 truncate">
                            রিয়েল-টাইম এসএমএস ও ওটিপি সিঙ্ক
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Mini Google Browser */}
                  <button
                    id="sidebar-prog-mini-browser"
                    onClick={() => {
                      miniBrowser.openBrowser();
                      if (window.innerWidth < 768) onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 dark:bg-blue-950/30 dark:hover:bg-blue-950/60 border border-blue-300/50 dark:border-blue-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-950 dark:text-blue-200 truncate">
                          মিনি গুগল ওয়েব ব্রাউজার
                        </p>
                        <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 truncate">
                          লাইভ ওয়েব সার্চ ও রেফারেন্স
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Text-to-Speech Speed & Voice Settings */}
                  {onOpenTTSSettings && (
                    <button
                      id="sidebar-prog-tts-settings"
                      onClick={() => {
                        onOpenTTSSettings();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-950/60 border border-purple-300/50 dark:border-purple-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Volume2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-purple-950 dark:text-purple-200 truncate flex items-center gap-1.5">
                            <span>পড়ার গতি ও ভয়েস কন্ট্রোল</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-700 dark:text-purple-300">TTS</span>
                          </p>
                          <p className="text-[10px] text-purple-700/80 dark:text-purple-400/80 truncate">
                            সহকারীর উত্তর পড়ার গতি ও কণ্ঠ সেটিংস
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Founder & Super Admin Profile */}
                  {onOpenFounderProfile && (
                    <button
                      id="sidebar-prog-founder-profile"
                      onClick={() => {
                        onOpenFounderProfile();
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 border border-amber-300/60 dark:border-amber-800/60 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-950 dark:text-amber-200 truncate flex items-center gap-1.5">
                            <span>ডিজিটাল স্মার্ট প্রোফাইল আইডি কার্ড</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">VERIFIED</span>
                          </p>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 truncate">
                            শেখ ফরিদ (Sheikh Farid) • আইডি তৈরি ও আপডেট
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}

                  {/* Share App Modal */}
                  {onOpenShare && (
                    <button
                      id="sidebar-prog-share"
                      onClick={() => {
                        onOpenShare({ shareType: 'app' });
                        if (window.innerWidth < 768) onClose();
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-300/50 dark:border-emerald-800/50 text-left transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 truncate">
                            সোশ্যাল মিডিয়ায় শেয়ার করুন
                          </p>
                          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 truncate">
                            WhatsApp, FB, লিঙ্ক ও QR কোড
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category 2: Assistant Modes */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 px-1 mb-1.5">
                  🎯 অ্যাসিস্ট্যান্ট মোডসমূহ (Modes)
                </p>
                <div className="space-y-1">
                  {modesList.map((m) => {
                    const Icon = m.icon;
                    const isActive = currentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        id={`sidebar-mode-item-${m.id}`}
                        onClick={() => {
                          onSelectMode(m.id);
                          if (window.innerWidth < 768) onClose();
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all cursor-pointer ${
                          isActive
                            ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 font-semibold shadow-xs'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-200/70 dark:hover:bg-stone-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400 dark:text-emerald-600' : m.color}`} />
                          <div className="min-w-0">
                            <span className="block truncate">{m.label}</span>
                            <span className={`block text-[10px] truncate ${isActive ? 'text-stone-300 dark:text-stone-600' : 'text-stone-400'}`}>
                              {m.desc}
                            </span>
                          </div>
                        </div>
                        {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600 shrink-0 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PWA Install */}
              <div className="pt-1">
                <PWAInstallButton variant="sidebar" />
              </div>
            </div>
          ) : (
            /* =================== TAB 2: CHAT SESSIONS HISTORY =================== */
            <div className="space-y-2.5">
              {/* Active Search Result Count Banner */}
              {trimmedSearchQuery && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <span className="truncate">
                    &ldquo;{historySearchQuery.trim()}&rdquo; — {filteredSessions.length}টি ফলাফল
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="ml-2 shrink-0 font-semibold hover:underline cursor-pointer"
                  >
                    সব দেখুন
                  </button>
                </div>
              )}

              {/* Sessions List */}
              <div className="space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 dark:text-stone-400">
                    {trimmedSearchQuery ? 'কোনো চ্যাট খুঁজে পাওয়া যায়নি।' : 'কোনো পূর্ববর্তী চ্যাট নেই। নতুন চ্যাট শুরু করুন!'}
                  </div>
                ) : (
                  <>
                    {/* Pinned Sessions Section */}
                    {pinnedSessions.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 px-1 pb-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>পিন করা চ্যাট ({pinnedSessions.length})</span>
                        </div>
                        <div className="space-y-1">
                          {pinnedSessions.map((s) => renderSessionItem(s))}
                        </div>
                      </div>
                    )}

                    {/* Unpinned / Recent Sessions Section */}
                    {unpinnedSessions.length > 0 && (
                      <div className="space-y-1">
                        {pinnedSessions.length > 0 && (
                          <div className="flex items-center gap-1.5 px-1 pt-1 pb-0.5 text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                            <span>সাম্প্রতিক চ্যাট ({unpinnedSessions.length})</span>
                          </div>
                        )}
                        <div className="space-y-1">
                          {unpinnedSessions.map((s) => renderSessionItem(s))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Firebase Cloud Sync Status Card */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 shrink-0 bg-stone-100/60 dark:bg-stone-900/60">
          {user ? (
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-emerald-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">
                      ফায়ারস্টোর ক্লাউড সিঙ্ক
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              id="sidebar-cloud-login-btn"
              onClick={() => signIn()}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-white hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 text-left transition-colors group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                    ক্লাউড ব্যাকআপ সিঙ্ক
                  </p>
                  <p className="text-[10px] text-stone-500 dark:text-stone-400">
                    Firestore-এ চ্যাট সংরক্ষণ করুন
                  </p>
                </div>
              </div>
              <LogIn className="w-3.5 h-3.5 text-stone-400 group-hover:text-emerald-600 transition-colors" />
            </button>
          )}
        </div>

        {/* Footer specs & Identity */}
        <div className="px-3.5 py-2.5 bg-stone-200/50 dark:bg-stone-950/70 border-t border-stone-200 dark:border-stone-800 text-[10px] text-stone-500 dark:text-stone-400 space-y-1 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 dark:text-stone-300">কোম্পানি / প্ল্যাটফর্ম:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">AI Assistant & Coding Studio</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700 dark:text-stone-300">ডেভেলপমেন্ট:</span>
            <span className="text-stone-600 dark:text-stone-400">সফটওয়্যার ইঞ্জিনিয়ারিং টিম</span>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-stone-200/60 dark:border-stone-800/60">
            <span className="flex items-center gap-1 font-mono">
              <Cpu className="w-3 h-3 text-emerald-500" />
              Engine:
            </span>
            <span className="font-semibold text-stone-700 dark:text-stone-300">Gemini 3.8 Flash</span>
          </div>
        </div>
      </aside>
    </>
  );
};
