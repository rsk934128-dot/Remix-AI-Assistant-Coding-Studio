import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  X,
  Volume2,
  VolumeX,
  Sparkles,
  Clock,
  Briefcase,
  Bot,
  Shield,
  Layers,
  Calendar,
  Plus,
  ExternalLink,
  ChevronRight,
  Send,
  Zap,
  Info,
} from 'lucide-react';
import { useNotifications, NotificationCategory, AppNotification } from '../context/NotificationContext';

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
  onOpenFreelanceJobs?: () => void;
  onOpenMetrics?: () => void;
  onOpenGoogleDrive?: () => void;
  darkMode?: boolean;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onOpenFreelanceJobs,
  onOpenMetrics,
  onOpenGoogleDrive,
}) => {
  const {
    notifications,
    unreadCount,
    permission,
    requestPermission,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    isSoundEnabled,
    toggleSound,
    playNotificationSound,
    scheduleReminder,
    scheduledReminders,
    cancelReminder,
  } = useNotifications();

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [isScheduling, setIsScheduling] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [reminderCategory, setReminderCategory] = useState<'reminders' | 'jobs' | 'ai'>('reminders');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((notif) => {
    if (activeCategory === 'all') return true;
    return notif.category === activeCategory;
  });

  const handleTestNotification = () => {
    playNotificationSound();
    sendNotification({
      title: 'টেস্ট নোটিফিকেশন সফল! 🚀',
      message: 'আপনার অ্যাপের ইন-অ্যাপ এবং সিস্টেম পুশ নোটিফিকেশন ইঞ্জিন শতভাগ কার্যকর রয়েছে।',
      category: 'system',
      priority: 'high',
      playAudio: true,
      actionLabel: 'মেট্রিক্স দেখুন',
      actionType: 'open_metrics',
    });
  };

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTitle.trim()) return;
    scheduleReminder(reminderTitle.trim(), `${reminderMinutes} মিনিট সম্পন্ন হয়েছে। আপনার নির্ধারিত কাজটি সম্পন্ন করুন।`, reminderMinutes, reminderCategory);
    setReminderTitle('');
    setIsScheduling(false);
  };

  const handleNotificationAction = (notif: AppNotification) => {
    markAsRead(notif.id);
    onClose();
    if (notif.actionType === 'open_jobs' && onOpenFreelanceJobs) {
      onOpenFreelanceJobs();
    } else if (notif.actionType === 'open_metrics' && onOpenMetrics) {
      onOpenMetrics();
    } else if (notif.actionType === 'open_drive' && onOpenGoogleDrive) {
      onOpenGoogleDrive();
    } else if (notif.actionType === 'custom_url' && notif.actionData) {
      window.open(notif.actionData, '_blank');
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'এইমাত্র';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ঘণ্টা আগে`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays} দিন আগে`;
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ai':
        return <Bot className="w-4 h-4 text-purple-400" />;
      case 'jobs':
        return <Briefcase className="w-4 h-4 text-amber-400" />;
      case 'reminders':
        return <Clock className="w-4 h-4 text-rose-400" />;
      case 'system':
      default:
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'ai':
        return 'এআই কোডিং';
      case 'jobs':
        return 'ফ্রিল্যান্স জব';
      case 'reminders':
        return 'রিমাইন্ডার';
      case 'system':
      default:
        return 'সিস্টেম';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center animate-pulse shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">নোটিফিকেশন সেন্টার</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  রিয়েল-টাইম পুশ ও রিমাইন্ডার
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                এআই রেসপন্স, জব এলার্ট ও কাস্টম শিডিউলড নোটিফিকেশন হাব
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                isSoundEnabled
                  ? 'bg-blue-950/40 border-blue-500/30 text-blue-400 hover:bg-blue-900/40'
                  : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
              title={isSoundEnabled ? 'শব্দ চালু আছে (মিউট করতে ক্লিক করুন)' : 'শব্দ মিউট আছে (চালু করতে ক্লিক করুন)'}
            >
              {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Test Push Button */}
            <button
              type="button"
              onClick={handleTestNotification}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer border border-stone-700"
              title="টেস্ট নোটিফিকেশন পাঠান"
            >
              <Zap className="w-4 h-4 text-amber-400" />
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Push Permission Banner if not granted */}
        {permission !== 'granted' && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-blue-950/50 via-indigo-950/40 to-stone-900 border border-blue-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                <BellRing className="w-4 h-4 animate-bounce" />
              </div>
              <div className="space-y-0.5">
                <div className="font-bold text-white">সিস্টেম পুশ নোটিফিকেশন বন্ধ রয়েছে</div>
                <div className="text-stone-300 text-[11px]">
                  অ্যাপ মিনিমাইজ বা লক করা থাকলেও ব্যাকগ্রাউন্ডে গুরুত্বপূর্ণ এলার্ট পেতে ব্রাউজার পারমিশন দিন।
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={requestPermission}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/30 shrink-0 cursor-pointer"
            >
              অনুমোদন দিন 🔔
            </button>
          </div>
        )}

        {/* Active Scheduled Reminders Badge Bar */}
        {scheduledReminders.length > 0 && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                আসন্ন রিমাইন্ডারসমূহ ({scheduledReminders.length}):
              </span>
              <button
                type="button"
                onClick={() => setIsScheduling(true)}
                className="text-[11px] text-blue-400 hover:underline cursor-pointer"
              >
                + নতুন যোগ করুন
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {scheduledReminders.map((rem) => {
                const remainingMin = Math.max(1, Math.round((rem.triggerAt - Date.now()) / (1000 * 60)));
                return (
                  <div
                    key={rem.id}
                    className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-stone-900 border border-stone-700 text-[11px] text-stone-200"
                  >
                    <span className="font-medium truncate max-w-[140px]">{rem.title}</span>
                    <span className="text-rose-400 font-mono text-[10px]">{remainingMin}মি বাকি</span>
                    <button
                      type="button"
                      onClick={() => cancelReminder(rem.id)}
                      className="text-stone-400 hover:text-rose-400 cursor-pointer ml-0.5"
                      title="বাতিল করুন"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Categories Bar & Action Controls */}
        <div className="px-6 pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800 bg-stone-950/30">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'সকল', count: notifications.length },
              { id: 'ai', label: 'এআই কোডিং', count: notifications.filter((n) => n.category === 'ai').length },
              { id: 'jobs', label: 'ফ্রিল্যান্স', count: notifications.filter((n) => n.category === 'jobs').length },
              { id: 'reminders', label: 'রিমাইন্ডার', count: notifications.filter((n) => n.category === 'reminders').length },
              { id: 'system', label: 'সিস্টেম', count: notifications.filter((n) => n.category === 'system').length },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-xs'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-400">
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsScheduling(!isScheduling)}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>রিমাইন্ডার সেট</span>
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="সব পড়া হয়েছে হিসেবে চিহ্নিত করুন"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">পড়া হয়েছে</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Schedule Form Accordion */}
        {isScheduling && (
          <form
            onSubmit={handleCreateReminder}
            className="mx-6 mt-3 p-4 rounded-2xl bg-stone-950 border border-blue-500/30 space-y-3 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                কাস্টম নোটিফিকেশন রিমাইন্ডার তৈরি
              </span>
              <button
                type="button"
                onClick={() => setIsScheduling(false)}
                className="text-stone-400 hover:text-stone-200 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="যেমন: কোডিং বিরতি, প্রজেক্ট ক্লায়েন্ট রিপ্লাই, নামাজের সময়"
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <select
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value={5}>৫ মিনিট পর</option>
                  <option value={15}>১৫ মিনিট পর</option>
                  <option value={30}>৩০ মিনিট পর</option>
                  <option value={60}>১ ঘণ্টা পর</option>
                  <option value={120}>২ ঘণ্টা পর</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsScheduling(false)}
                className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                রিমাইন্ডার চালু করুন
              </button>
            </div>
          </form>
        )}

        {/* Notifications Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-3xl bg-stone-800/60 border border-stone-700 text-stone-500 flex items-center justify-center mx-auto">
                <BellOff className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-stone-300">কোনো নোটিফিকেশন নেই</div>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  নতুন এআই আপডেট, ফ্রিল্যান্স প্রপোজাল বা রিমাইন্ডার আসলে এখানে স্বয়ংক্রিয়ভাবে জমা হবে।
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestNotification}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-blue-400 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 border border-stone-700"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>টেস্ট নোটিফিকেশন পাঠান</span>
              </button>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`relative p-4 rounded-2xl border transition-all ${
                  notif.read
                    ? 'bg-stone-900/60 border-stone-800/80 text-stone-300'
                    : 'bg-stone-900 border-blue-500/40 shadow-md text-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-stone-800 border border-stone-700/80 shrink-0 mt-0.5">
                      {getCategoryIcon(notif.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">
                          {notif.title}
                        </span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        <span className="px-2 py-0.2 rounded-full text-[9px] font-semibold bg-stone-800 text-stone-400 border border-stone-700">
                          {getCategoryBadge(notif.category)}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-stone-500">
                        <span>{formatRelativeTime(notif.timestamp)}</span>
                        {notif.actionLabel && (
                          <button
                            type="button"
                            onClick={() => handleNotificationAction(notif)}
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            <span>{notif.actionLabel}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(notif.id)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="পড়া হয়েছে"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification(notif.id)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-3">
            <span>মোট: {notifications.length}টি নোটিফিকেশন</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-stone-500 hover:text-rose-400 transition-colors cursor-pointer underline"
              >
                সব পরিষ্কার করুন
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-semibold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
