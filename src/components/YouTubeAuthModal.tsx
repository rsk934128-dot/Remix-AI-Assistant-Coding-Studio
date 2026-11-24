import React, { useState } from 'react';
import {
  X,
  Youtube,
  LogIn,
  LogOut,
  RefreshCw,
  ExternalLink,
  Play,
  ListMusic,
  User,
  ShieldCheck,
  CheckCircle2,
  Video,
  Eye,
  Radio,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { YouTubePlaylistItem } from '../types';

interface YouTubeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const YouTubeAuthModal: React.FC<YouTubeAuthModalProps> = ({ isOpen, onClose }) => {
  const {
    isYouTubeConnected,
    youtubeUser,
    youtubePlaylists,
    isFetchingPlaylists,
    signInWithYouTube,
    connectPublicChannel,
    fetchYouTubePlaylists,
    fetchPlaylistTracks,
    disconnectYouTube,
    authError,
    clearAuthError,
    isPopupBlocked,
    clearPopupBlocked,
  } = useAuth();

  const { playQueue, expandPlayer } = useMusicPlayer();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [publicChannelInput, setPublicChannelInput] = useState('');
  const [isConnectingPublic, setIsConnectingPublic] = useState(false);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsSigningIn(true);
    clearAuthError();
    clearPopupBlocked();
    try {
      await signInWithYouTube();
    } catch (_) {
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleConnectPublic = async () => {
    if (!publicChannelInput.trim()) return;
    setIsConnectingPublic(true);
    try {
      await connectPublicChannel(publicChannelInput.trim());
    } finally {
      setIsConnectingPublic(false);
    }
  };

  const handlePlayPlaylist = async (playlist: YouTubePlaylistItem) => {
    setLoadingPlaylistId(playlist.id);
    try {
      const tracks = await fetchPlaylistTracks(playlist.id);
      if (tracks && tracks.length > 0) {
        playQueue(tracks, 0, { autoPlay: true });
        expandPlayer();
        onClose();
      } else {
        alert('এই প্লেলিস্টটিতে কোনো পাবলিক গান পাওয়া যায়নি।');
      }
    } catch (e) {
      console.warn('Failed to load playlist tracks:', e);
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  const filteredPlaylists = youtubePlaylists.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-stone-950 text-stone-100 border border-red-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Glow Header */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-red-950/80 via-stone-900 to-stone-950 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30 text-white">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  ইউটিউব চ্যানেল ও প্লেলিস্ট স্টুডিও
                </h3>
                {isYouTubeConnected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    কানেক্টেড
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                    লগইন প্রয়োজন
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-400">
                আপনার ইউটিউব অ্যাকাউন্ট সংযোগ করে পার্সোনাল প্লেলিস্ট ও পছন্দের গান নিরবচ্ছিন্নভাবে শুনুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Popup Blocked Guidance Box */}
          {isPopupBlocked && (
            <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs space-y-2.5 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ব্রাউজার পপ-আপ ব্লক সমাধান নির্দেশিকা (Allow Pop-ups)</span>
              </div>
              <p className="text-[11px] text-amber-100/90 leading-relaxed">
                আপনার ব্রাউজার নিরাপত্তার কারণে গুগল সাইন-ইন পপ-আপ উইন্ডোটি আটকে দিয়েছে।
                <br />
                👉 <strong>কীভাবে অনুমোদন করবেন:</strong> ব্রাউজারের অ্যাড্রেসবারে (URL bar) থাকা 🔒 বা 🚫 পপ-আপ ব্লকার আইকনে ক্লিক করে <strong>"Always allow pop-ups and redirects from this site"</strong> নির্বাচন করুন এবং <strong>Done</strong> চাপুন।
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isSigningIn}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-md transition-colors"
                >
                  অনুমোদন করে পুনরায় লগইন করুন
                </button>
                <button
                  type="button"
                  onClick={clearPopupBlocked}
                  className="px-3 py-1.5 rounded-xl bg-stone-850 hover:bg-stone-800 text-stone-300 text-xs cursor-pointer"
                >
                  বার্তাটি বন্ধ করুন
                </button>
              </div>
            </div>
          )}

          {authError && !isPopupBlocked && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <span className="font-bold block">সংযোগ বিজ্ঞপ্তি</span>
                <p>{authError}</p>
              </div>
              <button onClick={clearAuthError} className="text-rose-400 hover:text-white font-bold">✕</button>
            </div>
          )}

          {!isYouTubeConnected ? (
            /* NOT CONNECTED STATE */
            <div className="py-8 px-4 text-center space-y-5 rounded-3xl bg-stone-900/60 border border-stone-800/80">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-xl shadow-red-600/30 text-white animate-pulse">
                <Youtube className="w-8 h-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-white">গুগল / ইউটিউব দিয়ে সাইন-ইন করুন</h4>
                <p className="text-xs text-stone-300 leading-relaxed">
                  ইউটিউব ডাটা এপিআই (YouTube Data API v3) ইন্টিগ্রেশনের মাধ্যমে আপনার সেভ করা প্লেলিস্টগুলো সরাসরি আমাদের মিউজিক প্লেয়ারে লোড করুন এবং একের পর এক স্বয়ংক্রিয়ভাবে উপভোগ করুন।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left text-xs pt-2">
                <div className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold">
                    <ListMusic className="w-3.5 h-3.5" />
                    <span>ব্যক্তিগত প্লেলিস্ট</span>
                  </div>
                  <p className="text-[11px] text-stone-400">আপনার ইউটিউবে বানানো প্রিয় গানের প্লেলিস্ট লোড হবে।</p>
                </div>
                <div className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>অটো-কন্টিনিউয়াস</span>
                  </div>
                  <p className="text-[11px] text-stone-400">একটি গান শেষ হলে পরবর্তী গান নিজে নিজে চালু হবে।</p>
                </div>
                <div className="p-3 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ক্লাউড ব্যাকআপ</span>
                  </div>
                  <p className="text-[11px] text-stone-400">লগইন হিস্ট্রি ও পছন্দের গান ফায়ারস্টোরে সুরক্ষিত থাকবে।</p>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-red-600/30 transition-all cursor-pointer"
                >
                  {isSigningIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>গুগল অথেন্টিকেশন যাচাই হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ইউটিউব দিয়ে সাইন-ইন করুন (Sign in with YouTube)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Alternative: Public Channel / Handle Connect without requiring popups */}
              <div className="pt-4 border-t border-stone-800/80 max-w-md mx-auto space-y-2 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>অথবা লগইন ছাড়াই যেকোনো চ্যানেল বা হ্যান্ডেল দিয়ে দেখুন:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={publicChannelInput}
                    onChange={(e) => setPublicChannelInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnectPublic()}
                    placeholder="হ্যান্ডেল বা নাম (যেমন: @tseries, @banglasongs)"
                    className="flex-1 px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={handleConnectPublic}
                    disabled={isConnectingPublic || !publicChannelInput.trim()}
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-red-700 text-white text-xs font-semibold border border-stone-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isConnectingPublic ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'কানেক্ট'}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500">
                  পপ-আপ সমস্যা হলে যেকোনো পাবলিক চ্যানেলের প্লেলিস্ট সরাসরি ব্রাউজ ও প্লে করুন।
                </p>
              </div>
            </div>
          ) : (
            /* CONNECTED USER PROFILE & PLAYLISTS */
            <div className="space-y-6">
              {/* Channel Profile Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-red-950/60 via-stone-900 to-stone-950 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {youtubeUser?.thumbnail ? (
                    <img
                      src={youtubeUser.thumbnail}
                      alt={youtubeUser.title}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-red-500 shadow-md shadow-red-500/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                      <User className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-white">{youtubeUser?.title || 'YouTube Channel'}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                        ভেরিফাইড চ্যানেল ✓
                      </span>
                    </div>
                    {youtubeUser?.customUrl && (
                      <p className="text-xs text-stone-400">{youtubeUser.customUrl}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-300 pt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <User className="w-3 h-3 text-red-400" />
                        <span>{youtubeUser?.subscriberCount ? String(youtubeUser.subscriberCount) : '0'} সাবস্ক্রাইবার</span>
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Video className="w-3 h-3 text-amber-400" />
                        <span>{youtubeUser?.videoCount ? String(youtubeUser.videoCount) : '0'} ভিডিও</span>
                      </span>
                      {youtubeUser?.viewCount && (
                        <span className="flex items-center gap-1 font-mono">
                          <Eye className="w-3 h-3 text-blue-400" />
                          <span>{String(youtubeUser.viewCount)} ভিউ</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fetchYouTubePlaylists()}
                    disabled={isFetchingPlaylists}
                    className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-850 text-stone-200 border border-stone-800 transition-colors cursor-pointer"
                    title="প্লেলিস্ট রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetchingPlaylists ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={disconnectYouTube}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-rose-950/70 text-stone-300 hover:text-rose-300 text-xs font-semibold border border-stone-800 hover:border-rose-800/60 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="ইউটিউব অ্যাকাউন্ট সংযোগ বিচ্ছিন্ন করুন"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>লগআউট</span>
                  </button>
                </div>
              </div>

              {/* Playlists Search & Header */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ListMusic className="w-4 h-4 text-red-500" />
                      <span>আপনার ইউটিউব প্লেলিস্টসমূহ ({youtubePlaylists.length}টি)</span>
                    </h4>
                    <p className="text-[11px] text-stone-400">
                      যেকোনো প্লেলিস্টে ক্লিক করে সব গান স্বয়ংক্রিয়ভাবে কিউতে নিয়ে চালান
                    </p>
                  </div>

                  {youtubePlaylists.length > 5 && (
                    <input
                      type="text"
                      placeholder="প্লেলিস্ট খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-red-500 max-w-xs"
                    />
                  )}
                </div>

                {/* Playlists Grid */}
                {isFetchingPlaylists ? (
                  <div className="py-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-red-500 animate-spin mx-auto" />
                    <p className="text-xs text-stone-400">ইউটিউব প্লেলিস্ট লোড হচ্ছে...</p>
                  </div>
                ) : filteredPlaylists.length === 0 ? (
                  <div className="p-8 text-center space-y-3 rounded-2xl bg-stone-900/40 border border-stone-800 text-stone-400">
                    <ListMusic className="w-8 h-8 mx-auto text-stone-600" />
                    <p className="text-sm font-semibold text-stone-300">কোনো প্লেলিস্ট পাওয়া যায়নি</p>
                    <p className="text-xs">আপনার ইউটিউব অ্যাকাউন্টে কোনো পাবলিক বা আনলিস্টেড প্লেলিস্ট তৈরি করা থাকলে এখানে প্রদর্শিত হবে।</p>
                    <button
                      type="button"
                      onClick={() => fetchYouTubePlaylists()}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-white text-xs font-semibold"
                    >
                      পুনরায় রিফ্রেশ করুন
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {filteredPlaylists.map((pl) => {
                      const isLoadingThis = loadingPlaylistId === pl.id;
                      return (
                        <div
                          key={pl.id}
                          className="p-3 rounded-2xl bg-stone-900/80 hover:bg-stone-850 border border-stone-800/80 hover:border-red-500/40 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black shrink-0 border border-stone-800">
                              {pl.thumbnail ? (
                                <img
                                  src={pl.thumbnail}
                                  alt={pl.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
                                  <ListMusic className="w-5 h-5" />
                                </div>
                              )}
                              {pl.itemCount !== undefined && (
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 bg-black/80 text-[9px] font-mono font-bold text-white rounded">
                                  {pl.itemCount}
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 space-y-0.5">
                              <h5 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors" title={pl.title}>
                                {pl.title}
                              </h5>
                              <p className="text-[10px] text-stone-400 truncate">
                                {pl.itemCount ? `${pl.itemCount}টি গান` : 'প্লেলিস্ট'}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              type="button"
                              onClick={() => handlePlayPlaylist(pl)}
                              disabled={isLoadingThis}
                              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                              title="সব গান লোড করে চালান"
                            >
                              {isLoadingThis ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                              )}
                              <span className="hidden sm:inline">চালান</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-900/60 border-t border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>YouTube Data API v3 • নিরাপদ ও এনক্রিপ্টেড সংযোগ</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-medium cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
