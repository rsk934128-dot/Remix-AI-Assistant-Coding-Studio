/**
 * Utility functions for detecting In-App WebViews,
 * detecting disallowed_useragent risks, and generating Chrome Custom Tabs / Intent links.
 */

export interface BrowserEnvironmentInfo {
  isWebView: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isStandalonePWA: boolean;
  inAppBrowserName: string | null;
  userAgent: string;
  isOAuthSafe: boolean;
  recommendedAction: string;
}

export function detectBrowserEnvironment(): BrowserEnvironmentInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isWebView: false,
      isAndroid: false,
      isIOS: false,
      isStandalonePWA: false,
      inAppBrowserName: null,
      userAgent: '',
      isOAuthSafe: true,
      recommendedAction: 'Standard Web Environment',
    };
  }

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Standalone PWA or TWA
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-ignore
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  let inAppBrowserName: string | null = null;
  let isWebView = false;

  if (/FBAN|FBAV/i.test(ua)) {
    inAppBrowserName = 'Facebook In-App Browser';
    isWebView = true;
  } else if (/Instagram/i.test(ua)) {
    inAppBrowserName = 'Instagram In-App Browser';
    isWebView = true;
  } else if (/Messenger/i.test(ua)) {
    inAppBrowserName = 'Facebook Messenger';
    isWebView = true;
  } else if (/Line\//i.test(ua)) {
    inAppBrowserName = 'LINE Browser';
    isWebView = true;
  } else if (/MicroMessenger/i.test(ua)) {
    inAppBrowserName = 'WeChat Browser';
    isWebView = true;
  } else if (/Twitter|TwitterAndroid|TwitterforiPhone/i.test(ua)) {
    inAppBrowserName = 'X (Twitter) In-App Browser';
    isWebView = true;
  } else if (/LinkedInApp/i.test(ua)) {
    inAppBrowserName = 'LinkedIn In-App Browser';
    isWebView = true;
  } else if (/Snapchat/i.test(ua)) {
    inAppBrowserName = 'Snapchat In-App Browser';
    isWebView = true;
  } else if (/musical_ly|ByteDance|TikTok/i.test(ua)) {
    inAppBrowserName = 'TikTok In-App Browser';
    isWebView = true;
  } else if (isAndroid && /; wv\b/i.test(ua)) {
    inAppBrowserName = 'Android WebView (Embedded)';
    isWebView = true;
  } else if (isAndroid && /Version\/[0-9.]+\s+Chrome/i.test(ua) && !isStandalonePWA) {
    inAppBrowserName = 'Android WebView (Version Chrome)';
    isWebView = true;
  }

  // Google OAuth blocks all restricted webviews with disallowed_useragent (403 Error)
  const isOAuthSafe = !isWebView || isStandalonePWA;

  let recommendedAction = 'ব্রাউজার নিরাপদ ও গুগল লগইনের জন্য প্রস্তুত।';
  if (isWebView && !isStandalonePWA) {
    if (isAndroid) {
      recommendedAction = 'ইন-অ্যাপ ওয়েবভিউ শনাক্ত হয়েছে। গুগল লগইনের জন্য Chrome Custom Tabs বা ক্রোম ব্রাউজারে খুলুন।';
    } else if (isIOS) {
      recommendedAction = 'ইন-অ্যাপ ওয়েবভিউ শনাক্ত হয়েছে। গুগল লগইনের জন্য Safari বা ক্রোম ব্রাউজারে খুলুন।';
    } else {
      recommendedAction = 'বাহ্যিক সিস্টেমে ক্রোম ব্রাউজারে ওপেন করার পরামর্শ দেওয়া হচ্ছে।';
    }
  }

  return {
    isWebView,
    isAndroid,
    isIOS,
    isStandalonePWA,
    inAppBrowserName,
    userAgent: ua,
    isOAuthSafe,
    recommendedAction,
  };
}

/**
 * Returns an Android Intent URI that forces opening in Google Chrome
 */
export function getAndroidChromeIntentUrl(targetUrl?: string): string {
  const currentUrl = targetUrl || (typeof window !== 'undefined' ? window.location.href : 'https://remixaiassistant.web.app');
  try {
    const parsed = new URL(currentUrl);
    // Format: intent://<host><pathname><search>#Intent;scheme=https;package=com.android.chrome;end
    const scheme = parsed.protocol.replace(':', '');
    const cleanHostAndPath = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return `intent://${cleanHostAndPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
  } catch {
    return currentUrl;
  }
}

/**
 * Attempt to open URL in external default browser
 */
export function openInExternalSystemBrowser(targetUrl?: string): boolean {
  if (typeof window === 'undefined') return false;
  const url = targetUrl || window.location.href;
  const env = detectBrowserEnvironment();

  if (env.isAndroid) {
    try {
      const intentUrl = getAndroidChromeIntentUrl(url);
      window.location.href = intentUrl;
      return true;
    } catch {
      window.open(url, '_blank');
      return true;
    }
  }

  // Fallback for iOS or desktop
  window.open(url, '_blank');
  return true;
}
