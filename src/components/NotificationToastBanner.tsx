import React from 'react';
import {
  Bell,
  X,
  ChevronRight,
  Bot,
  Briefcase,
  Clock,
  Shield,
} from 'lucide-react';
import { useNotifications, AppNotification } from '../context/NotificationContext';

export interface NotificationToastBannerProps {
  onOpenModal: () => void;
  onOpenFreelanceJobs?: () => void;
  onOpenMetrics?: () => void;
  onOpenGoogleDrive?: () => void;
}

export const NotificationToastBanner: React.FC<NotificationToastBannerProps> = ({
  onOpenModal,
  onOpenFreelanceJobs,
  onOpenMetrics,
  onOpenGoogleDrive,
}) => {
  const { toastNotification, dismissToast, markAsRead } = useNotifications();

  if (!toastNotification) return null;

  const getIcon = (category: string) => {
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

  const handleAction = () => {
    markAsRead(toastNotification.id);
    dismissToast();
    if (toastNotification.actionType === 'open_jobs' && onOpenFreelanceJobs) {
      onOpenFreelanceJobs();
    } else if (toastNotification.actionType === 'open_metrics' && onOpenMetrics) {
      onOpenMetrics();
    } else if (toastNotification.actionType === 'open_drive' && onOpenGoogleDrive) {
      onOpenGoogleDrive();
    } else if (toastNotification.actionType === 'custom_url' && toastNotification.actionData) {
      window.open(toastNotification.actionData, '_blank');
    } else {
      onOpenModal();
    }
  };

  return (
    <div className="fixed top-18 right-4 z-50 max-w-sm w-full animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className="p-4 rounded-2xl bg-stone-900/95 backdrop-blur-md border border-blue-500/40 text-stone-100 shadow-2xl space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
              {getIcon(toastNotification.category)}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                <span>{toastNotification.title}</span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed line-clamp-2">
                {toastNotification.message}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissToast}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
            title="বন্ধ করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[11px]">
          <button
            type="button"
            onClick={onOpenModal}
            className="text-stone-400 hover:text-stone-200 cursor-pointer flex items-center gap-1"
          >
            <Bell className="w-3 h-3 text-blue-400" />
            <span>নোটিফিকেশন সেন্টারে দেখুন</span>
          </button>

          {toastNotification.actionLabel && (
            <button
              type="button"
              onClick={handleAction}
              className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer flex items-center gap-0.5"
            >
              <span>{toastNotification.actionLabel}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
