import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { playNotificationChime } from '../utils/notificationSound';

export type NotificationCategory = 'all' | 'ai' | 'jobs' | 'reminders' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'ai' | 'jobs' | 'reminders' | 'system';
  timestamp: number;
  read: boolean;
  actionLabel?: string;
  actionType?: 'open_chat' | 'open_jobs' | 'open_metrics' | 'open_drive' | 'custom_url';
  actionData?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface ScheduledReminder {
  id: string;
  title: string;
  message: string;
  triggerAt: number; // timestamp ms
  category: 'reminders' | 'jobs' | 'ai';
}

export interface SendNotificationOptions {
  title: string;
  message?: string;
  body?: string;
  category?: 'ai' | 'jobs' | 'reminders' | 'system';
  actionLabel?: string;
  actionType?: 'open_chat' | 'open_jobs' | 'open_metrics' | 'open_drive' | 'custom_url';
  actionData?: string;
  priority?: 'high' | 'normal' | 'low';
  playAudio?: boolean;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  sendNotification: (options: SendNotificationOptions) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playNotificationSound: () => void;
  scheduleReminder: (title: string, message: string, delayMinutes: number, category?: 'reminders' | 'jobs' | 'ai') => void;
  scheduledReminders: ScheduledReminder[];
  cancelReminder: (id: string) => void;
  isNotificationModalOpen: boolean;
  setIsNotificationModalOpen: (val: boolean) => void;
  toastNotification: AppNotification | null;
  dismissToast: () => void;
}

const STORAGE_KEY = 'remix_ai_notifications_v1';
const SOUND_KEY = 'remix_ai_notification_sound_enabled';
const REMINDERS_KEY = 'remix_ai_scheduled_reminders_v1';

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome-1',
    title: 'স্বাগতম! নোটিফিকেশন সিস্টেম সক্রিয় 🔔',
    message: 'এখন থেকে আপনি রিয়েল-টাইম পুশ নোটিফিকেশন, এআই কোডিং আপডেট, ফ্রিল্যান্স এলার্ট ও রুটিন রিমাইন্ডার পাবেন।',
    category: 'system',
    timestamp: Date.now() - 1000 * 60 * 15,
    read: false,
    priority: 'high',
    actionLabel: 'সিস্টেম পরিচিতি',
    actionType: 'open_metrics',
  },
  {
    id: 'notif-ai-ready',
    title: 'Gemini এআই ও কোডিং ইঞ্জিন প্রস্তুত ⚡',
    message: 'বাংলা ও ইংরেজিতে নির্ভুল ফুল-স্ট্যাক কোডিং, গণিত সমাধান ও লাইভ সার্চ গ্রাউন্ডিং প্রস্তুত।',
    category: 'ai',
    timestamp: Date.now() - 1000 * 60 * 45,
    read: false,
    priority: 'normal',
    actionLabel: 'চ্যাটে প্রশ্ন করুন',
    actionType: 'open_chat',
  },
  {
    id: 'notif-freelance-alert',
    title: 'নতুন রিমোট প্রপোজাল ম্যাচ 💼',
    message: 'Upwork ও RemoteOK এ React + Node.js সম্পর্কিত ৩টি নতুন ভেরিফাইড রিমোট ক্লায়েন্ট জব পাওয়া গেছে।',
    category: 'jobs',
    timestamp: Date.now() - 1000 * 60 * 120,
    read: false,
    priority: 'high',
    actionLabel: 'জব হাব দেখুন',
    actionType: 'open_jobs',
  },
  {
    id: 'notif-routine-reminder',
    title: 'প্রোডাক্টিভিটি রিমাইন্ডার: বিরতি নিন 🧘',
    message: 'একটানা কোডিংয়ের পর চোখকে আরাম দিতে ৫ মিনিটের জন্য ২০-২০-২০ রুল অনুসরণ করুন।',
    category: 'reminders',
    timestamp: Date.now() - 1000 * 60 * 240,
    read: true,
    priority: 'low',
  },
];

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return DEFAULT_NOTIFICATIONS;
  });

  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>(() => {
    try {
      const stored = localStorage.getItem(REMINDERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });

  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SOUND_KEY);
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<AppNotification | null>(null);

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  // Sync scheduled reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(scheduledReminders));
    } catch {}
  }, [scheduledReminders]);

  // Sync sound preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, String(isSoundEnabled));
    } catch {}
  }, [isSoundEnabled]);

  // Periodic checker for scheduled reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setScheduledReminders((prev) => {
        const remaining: ScheduledReminder[] = [];
        prev.forEach((reminder) => {
          if (reminder.triggerAt <= now) {
            // Trigger this notification
            sendNotification({
              title: `⏰ ${reminder.title}`,
              message: reminder.message,
              category: reminder.category,
              priority: 'high',
              playAudio: true,
            });
          } else {
            remaining.push(reminder);
          }
        });
        return remaining;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => !prev);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (isSoundEnabled) {
      playNotificationChime(0.35);
    }
  }, [isSoundEnabled]);

  // Request native browser Push Notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('আপনার ব্রাউজারে সিস্টেম নোটিফিকেশন এপিআই সমর্থিত নয়।');
      return false;
    }

    try {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        playNotificationSound();
        try {
          new Notification('পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে! 🎉', {
            body: 'Remix AI Assistant থেকে সব গুরুত্বপূর্ণ এলার্ট ও রিমাইন্ডার এখন আপনার ডিভাইসে সরাসরি পৌঁছাবে।',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          });
        } catch {}
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Notification permission error:', err);
      return false;
    }
  }, [playNotificationSound]);

  // Send an in-app + system notification
  const sendNotification = useCallback(
    (options: SendNotificationOptions) => {
      const notifText = options.message || options.body || '';
      const newNotif: AppNotification = {
        id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title: options.title,
        message: notifText,
        category: options.category || 'system',
        timestamp: Date.now(),
        read: false,
        actionLabel: options.actionLabel,
        actionType: options.actionType,
        actionData: options.actionData,
        priority: options.priority || 'normal',
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 99)]); // Keep last 100

      // Play audio chime
      if (options.playAudio !== false && isSoundEnabled) {
        playNotificationChime(0.35);
      }

      // Show in-app floating banner toast
      setToastNotification(newNotif);
      setTimeout(() => {
        setToastNotification((curr) => (curr?.id === newNotif.id ? null : curr));
      }, 6000);

      // Trigger native System Push Notification if permission granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const sysNotif = new Notification(options.title, {
            body: options.message,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
          });
          sysNotif.onclick = () => {
            window.focus();
            setIsNotificationModalOpen(true);
            sysNotif.close();
          };
        } catch {}
      }
    },
    [isSoundEnabled]
  );

  const scheduleReminder = useCallback(
    (title: string, message: string, delayMinutes: number, category: 'reminders' | 'jobs' | 'ai' = 'reminders') => {
      const triggerAt = Date.now() + Math.max(1, delayMinutes) * 60 * 1000;
      const reminder: ScheduledReminder = {
        id: 'reminder-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title,
        message,
        triggerAt,
        category,
      };

      setScheduledReminders((prev) => [...prev, reminder]);

      sendNotification({
        title: 'রিমাইন্ডার সেট করা হয়েছে ⏰',
        message: `"${title}" - ${delayMinutes} মিনিট পর আপনার নোটিফিকেশন সেন্টারে বাজবে।`,
        category: 'reminders',
        priority: 'low',
        playAudio: false,
      });
    },
    [sendNotification]
  );

  const cancelReminder = useCallback((id: string) => {
    setScheduledReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const dismissToast = useCallback(() => {
    setToastNotification(null);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
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
        isNotificationModalOpen,
        setIsNotificationModalOpen,
        toastNotification,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
