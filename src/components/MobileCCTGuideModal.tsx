import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Code2,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  X,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  Globe,
  Settings,
  Terminal,
  Zap,
} from 'lucide-react';
import { detectBrowserEnvironment, getAndroidChromeIntentUrl, openInExternalSystemBrowser, BrowserEnvironmentInfo } from '../utils/browserDetection';

export interface MobileCCTGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

type FrameworkKey = 'android-kotlin' | 'flutter' | 'react-native' | 'webview-fix' | 'twa-playstore';

export const MobileCCTGuideModal: React.FC<MobileCCTGuideModalProps> = ({
  isOpen,
  onClose,
  darkMode = true,
}) => {
  const [activeFramework, setActiveFramework] = useState<FrameworkKey>('android-kotlin');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toolbarColor, setToolbarColor] = useState('#0f766e');
  const [targetUrl, setTargetUrl] = useState(
    typeof window !== 'undefined' ? window.location.href : 'https://remixaiassistant.web.app'
  );
  const [envInfo, setEnvInfo] = useState<BrowserEnvironmentInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEnvInfo(detectBrowserEnvironment());
      if (typeof window !== 'undefined' && !targetUrl) {
        setTargetUrl(window.location.href);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getCodeSnippets = () => {
    switch (activeFramework) {
      case 'android-kotlin':
        return {
          dependencyFile: 'app/build.gradle',
          dependencyCode: `dependencies {
    // AndroidX Browser for Chrome Custom Tabs (CCT)
    implementation "androidx.browser:browser:1.8.0"
}`,
          codeFile: 'SecureBrowserHelper.kt',
          code: `package com.example.app

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat

/**
 * 100% নিরাপদ ক্রোম কাস্টম ট্যাব যা Google OAuth এবং disallowed_useragent এরর ছাড়াই কাজ করে
 */
object SecureBrowserHelper {

    fun openCustomTab(context: Context, url: String = "${targetUrl}") {
        try {
            val builder = CustomTabsIntent.Builder()

            // অ্যাপের ব্র্যান্ড কালারের সাথে মিল রেখে টুলবার কালার সেট করুন
            builder.setToolbarColor(android.graphics.Color.parseColor("${toolbarColor}"))

            // পেজের টাইটেল ও শেয়ার অপশন অন রাখুন
            builder.setShowTitle(true)
            builder.setShareState(CustomTabsIntent.SHARE_STATE_ON)

            // অ্যানিমেশন ও ব্যাক বাটন ক্লোজ ট্রানজিশন
            builder.setStartAnimations(context, android.R.anim.fade_in, android.R.anim.fade_out)
            builder.setExitAnimations(context, android.R.anim.slide_in_left, android.R.anim.slide_out_right)

            val customTabsIntent = builder.build()
            
            // ডিফল্ট প্যাকেজ হিসেবে Google Chrome অগ্রাধিকার দিন (যদি ইনস্টল থাকে)
            customTabsIntent.intent.setPackage("com.android.chrome")

            customTabsIntent.launchUrl(context, Uri.parse(url))
        } catch (e: Exception) {
            // যদি ডিভাইসে ক্রোম না থাকে, সাধারণ ব্রাউজার ইনটেন্ট দিয়ে হ্যান্ডল করুন
            val fallbackIntent = CustomTabsIntent.Builder().build()
            fallbackIntent.launchUrl(context, Uri.parse(url))
        }
    }
}`,
        };

      case 'flutter':
        return {
          dependencyFile: 'pubspec.yaml',
          dependencyCode: `dependencies:
  flutter:
    sdk: flutter
  # Flutter Custom Tabs (Supports Android CCT & iOS SFSafariViewController)
  flutter_custom_tabs: ^2.1.0`,
          codeFile: 'lib/services/secure_browser.dart',
          code: `import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

/**
 * ফ্লাটারে গুগল লগইন ও এক্সটার্নাল লিঙ্ক খোলার জন্য CCT ও SafariViewController মেথড
 */
Future<void> launchSecureInAppChrome(BuildContext context, {String? targetUrl}) async {
  final url = targetUrl ?? '${targetUrl}';
  try {
    await launchUrl(
      Uri.parse(url),
      customTabsOptions: CustomTabsOptions(
        colorSchemes: CustomTabsColorSchemes.defaults(
          toolbarColor: const Color(0xFF${toolbarColor.replace('#', '')}),
          navigationBarColor: Colors.black,
        ),
        shareState: CustomTabsShareState.on,
        urlBarHidingEnabled: true,
        showTitle: true,
        closeButton: CustomTabsCloseButton(
          icon: CustomTabsCloseButtonIcons.back,
        ),
      ),
      safariViewControllerOptions: const SafariViewControllerOptions(
        preferredBarTintColor: Color(0xFF${toolbarColor.replace('#', '')}),
        preferredControlTintColor: Colors.white,
        dismissButtonStyle: SafariViewControllerDismissButtonStyle.close,
      ),
    );
  } catch (e) {
    debugPrint("Browser Launcher Error: \$e");
  }
}`,
        };

      case 'react-native':
        return {
          dependencyFile: 'terminal install',
          dependencyCode: `npm install react-native-inappbrowser-reborn
# iOS-এর জন্য:
cd ios && pod install && cd ..`,
          codeFile: 'src/utils/openSafeBrowser.ts',
          code: `import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

/**
 * React Native-এ Android Chrome Custom Tabs ও iOS SFSafariViewController চালক
 */
export const openSafeChromeBrowser = async (url: string = '${targetUrl}') => {
  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, {
        // iOS SFSafariViewController Properties
        dismissButtonStyle: 'cancel',
        preferredBarTintColor: '${toolbarColor}',
        preferredControlTintColor: '#ffffff',
        readerMode: false,
        animated: true,
        modalPresentationStyle: 'fullScreen',

        // Android Chrome Custom Tabs Properties
        showTitle: true,
        toolbarColor: '${toolbarColor}',
        secondaryToolbarColor: '#1e293b',
        navigationBarColor: '#0f172a',
        navigationBarDividerColor: '#334155',
        enableUrlBarHiding: true,
        enableDefaultShare: true,
        forceCloseOnRedirection: false,
        animations: {
          startEnter: 'slide_in_right',
          startExit: 'slide_out_left',
          endEnter: 'slide_in_left',
          endExit: 'slide_out_right',
        },
      });
    } else {
      // ডিভাইস ব্রাউজারে রিডাইরেক্ট ফলব্যাক
      await Linking.openURL(url);
    }
  } catch (error: any) {
    console.error('InAppBrowser failed to launch:', error.message);
    await Linking.openURL(url);
  }
};`,
        };

      case 'webview-fix':
        return {
          dependencyFile: 'Android WebView কনফিগারেশন',
          dependencyCode: `// Android Native WebView Settings Fix
// Warning: গুগল অফিসিয়ালি এটি রেকমেন্ড করে না, তবে WebView বজায় রাখতে চাইলে এটি কার্যকর`,
          codeFile: 'MyWebViewActivity.kt',
          code: `val myWebView: WebView = findViewById(R.id.webview)
val webSettings = myWebView.settings

webSettings.javaScriptEnabled = true
webSettings.domStorageEnabled = true
webSettings.databaseEnabled = true

// গুগল 403 disallowed_useragent আটকায় কারণ ডিফল্ট User-Agent-এ "; wv" বা "Version/X.X" থাকে।
// নিচের কোডটি সেই আইডেন্টিফায়ার মুছে পিওর গুগল ক্রোম ব্রাউজারের পরিচয় অনুকরণ করে:
val defaultUserAgent = webSettings.userAgentString
val patchedUserAgent = defaultUserAgent
    .replace("; wv", "")
    .replace(Regex("Version/[0-9.]+\\\\s+"), "")

webSettings.userAgentString = patchedUserAgent

// কুকি ও সেশন শেয়ার অন রাখুন
val cookieManager = android.webkit.CookieManager.getInstance()
cookieManager.setAcceptCookie(true)
cookieManager.setAcceptThirdPartyCookies(myWebView, true)`,
        };

      case 'twa-playstore':
        return {
          dependencyFile: 'Google Bubblewrap / TWA',
          dependencyCode: `# PWA থেকে সরাসরি Google Play Store APK ও AAB বানাতে Bubblewrap CLI ব্যবহার করুন
npm i -g @bubblewrap/cli
bubblewrap init --manifest="${targetUrl.replace(/\/$/, '')}/manifest.webmanifest"
bubblewrap build`,
          codeFile: 'AndroidManifest.xml (TWA Activity)',
          code: `<!-- Trusted Web Activity (TWA) সম্পূর্ণ Chrome Custom Tabs প্রযুক্তিতে চলে -->
<activity
    android:name="com.google.androidbrowserhelper.trusted.LauncherActivity"
    android:label="@string/app_name"
    android:theme="@style/Theme.LauncherActivity">
    
    <meta-data
        android:name="android.support.customtabs.trusted.DEFAULT_URL"
        android:value="${targetUrl}" />
    
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="${typeof window !== 'undefined' ? window.location.hostname : 'remixaiassistant.web.app'}" />
    </intent-filter>
</activity>`,
        };
    }
  };

  const snippets = getCodeSnippets();
  const chromeIntentUrl = getAndroidChromeIntentUrl(targetUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden text-stone-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Chrome Custom Tabs & In-App Browser Integration Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  disallowed_useragent 403 Fix
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                মোবাইল অ্যাপে (Android, Flutter, React Native, TWA) গুগল লগইন সুরক্ষিত রাখার ১০০% অফিশিয়াল ব্লুপ্রিন্ট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          
          {/* Key Advantages Card */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-1">
              <div className="flex items-center gap-2 text-cyan-300 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>লগইন ফেইল করবে না</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                গুগল সিকিউরিটি 403 disallowed_useragent এরর ছাড়াই OAuth সফলভাবে সেশন সম্পন্ন করে।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-1">
              <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                <Zap className="w-4 h-4" />
                <span>শেয়ার্ড কুকি ও সেশন</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                ফোনের আসল ক্রোম ব্রাউজারে লগইন থাকা গুগল অ্যাকাউন্ট ও অটোফিল স্বয়ংক্রিয়ভাবে ব্যবহার হয়।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-1">
              <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                <Layers className="w-4 h-4" />
                <span>ইন-অ্যাপ ফিল ও থিম</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                ইউজার অ্যাপ ছেড়ে বাইরে রিডাইরেক্ট হয় না; অ্যাপের প্রাইমারি কালারে টুলবার টিন্ট থাকে।
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-800/40 space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Globe className="w-4 h-4" />
                <span>পাসকি ও ওয়েবঅথন</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                Biometric fingerprint, Face ID এবং আধুনিক FIDO2 পাসকি সমর্থন নিশ্চিত করে।
              </p>
            </div>
          </div>

          {/* Current Visitor Environment Diagnostic */}
          {envInfo && (
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white">
                    আপনার বর্তমান ব্রাউজার রানটাইম ডায়াগনস্টিক
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    envInfo.isOAuthSafe
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {envInfo.isOAuthSafe ? '✓ OAuth Safe' : '⚠ In-App WebView Detected'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">প্ল্যাটফর্ম:</span>
                  <span className="font-semibold text-stone-200">
                    {envInfo.isAndroid ? 'Android' : envInfo.isIOS ? 'iOS Apple' : 'Desktop / Web'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">ওয়েবভিউ স্ট্যাটাস:</span>
                  <span className={`font-semibold ${envInfo.isWebView ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {envInfo.isWebView ? envInfo.inAppBrowserName || 'Embedded WebView' : 'স্বাভাবিক ব্রাউজার'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">PWA / TWA স্টাইল:</span>
                  <span className="font-semibold text-stone-200">
                    {envInfo.isStandalonePWA ? 'Standalone PWA/TWA' : 'ব্রাউজার ট্যাব'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                  <span className="text-[10px] text-stone-400 block">রিকমেন্ডেশন:</span>
                  <span className="font-semibold text-cyan-300 text-[11px] truncate block">
                    {envInfo.isOAuthSafe ? 'লগইন নিরাপদ' : 'Chrome-এ খুলুন'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openInExternalSystemBrowser(targetUrl)}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ক্রোম ব্রাউজারে টেস্ট রান (Launch Chrome Intent)</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyText(chromeIntentUrl, 'intent')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
                >
                  {copiedKey === 'intent' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Android Chrome Intent URI কপি</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyText(envInfo.userAgent, 'ua')}
                  className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-stone-700"
                >
                  {copiedKey === 'ua' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>User-Agent কপি</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive Parameters Bar */}
          <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[11px] font-semibold text-stone-400 block">
                টার্গেট অ্যাপ / ওয়েবসাইট লিঙ্ক (Target URL):
              </label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://your-domain.web.app"
              />
            </div>

            <div className="w-full sm:w-48 space-y-1">
              <label className="text-[11px] font-semibold text-stone-400 block">
                টুলবার কালার (Toolbar Tint):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={toolbarColor}
                  onChange={(e) => setToolbarColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={toolbarColor}
                  onChange={(e) => setToolbarColor(e.target.value)}
                  className="w-24 px-2 py-1 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Framework Switcher Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-stone-800">
            <button
              onClick={() => setActiveFramework('android-kotlin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFramework === 'android-kotlin'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>Android Native (Kotlin)</span>
            </button>

            <button
              onClick={() => setActiveFramework('flutter')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFramework === 'flutter'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>Flutter (Dart)</span>
            </button>

            <button
              onClick={() => setActiveFramework('react-native')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFramework === 'react-native'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>React Native (TypeScript)</span>
            </button>

            <button
              onClick={() => setActiveFramework('twa-playstore')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFramework === 'twa-playstore'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>Play Store TWA (Bubblewrap)</span>
            </button>

            <button
              onClick={() => setActiveFramework('webview-fix')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeFramework === 'webview-fix'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <span>WebView UserAgent Fix</span>
            </button>
          </div>

          {/* Code Viewer Section */}
          <div className="space-y-4">
            {/* Step 1: Dependency */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                    ১
                  </span>
                  <span className="text-xs font-bold text-stone-200">
                    ডিপেনডেন্সি ফাইল: <code className="text-cyan-400">{snippets.dependencyFile}</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(snippets.dependencyCode, 'dep')}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>কপি</span>
                </button>
              </div>
              <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[12px] font-mono text-cyan-200 overflow-x-auto">
                <code>{snippets.dependencyCode}</code>
              </pre>
            </div>

            {/* Step 2: Implementation Code */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                    ২
                  </span>
                  <span className="text-xs font-bold text-stone-200">
                    ইমপ্লিমেন্টেশন কোড: <code className="text-cyan-400">{snippets.codeFile}</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(snippets.code, 'code')}
                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>সম্পূর্ণ কোড কপি</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto max-h-72 leading-relaxed scrollbar-thin">
                <code>{snippets.code}</code>
              </pre>
            </div>
          </div>

          {/* Google disallowed_useragent Security Factsheet */}
          <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800 space-y-2 text-xs">
            <h4 className="font-bold text-stone-200 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>গুগল কেন সাধারণ WebView-তে লগইন ব্লক করে?</span>
            </h4>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              ২০১৬ সালের অক্টোবর থেকে গুগল সিকিউরিটি পলিসি অনুযায়ী কোনো অ্যাপ সাধারণ Web-View এর ভেতর ইউজারের মূল গুগল লগইন স্ক্রিন দেখাতে পারে না (Man-In-The-Middle বা ফিশিং আক্রমণ প্রতিহত করতে)। ক্রোম কাস্টম ট্যাব (CCT) এবং সাফারি ভিউ কন্ট্রোলার (SFSafariViewController) হলো গুগলের অফিসিয়াল স্টেকহোল্ডার আর্কিটেকচার যা অ্যাপকে সেশন ডেটায় সরাসরি স্পর্শ করতে দেয় না, ফলে ১০০% নিরাপদ এবং কখনোই ব্লক হয় না।
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-400">
          <span>Remix AI Assistant & Coding Studio Architecture Toolkit</span>
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
