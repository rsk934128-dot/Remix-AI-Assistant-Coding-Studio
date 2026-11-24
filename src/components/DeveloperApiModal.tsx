import React, { useState, useEffect } from 'react';
import {
  Key,
  Shield,
  Code2,
  Copy,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Activity,
  Layers,
  Send,
  ExternalLink,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  BarChart3,
  Server,
  Lock,
  Globe,
  Terminal,
  FileCode,
  X,
  CreditCard,
  ChevronRight,
  Database,
  Smartphone,
  ShieldCheck,
  Info
} from 'lucide-react';
import { detectBrowserEnvironment, getAndroidChromeIntentUrl, openInExternalSystemBrowser, BrowserEnvironmentInfo } from '../utils/browserDetection';

export interface DeveloperKey {
  id: string;
  keyName: string;
  keyPrefix: string;
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'revoked';
  rateLimit: number;
  monthlyQuota: number;
  usageCount: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface ApiLog {
  id: string;
  keyPrefix: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
}

export interface DeveloperAnalytics {
  totalCalls: number;
  activeKeysCount: number;
  totalKeysCount: number;
  successRate: number;
  avgLatency: number;
  recentLogs: ApiLog[];
  keys: DeveloperKey[];
}

interface DeveloperApiModalProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode?: boolean;
}

type TabType = 'keys' | 'analytics' | 'docs' | 'playground' | 'pricing' | 'mobile';
type CodeLang = 'curl' | 'nodejs' | 'python' | 'php';

export const DeveloperApiModal: React.FC<DeveloperApiModalProps> = ({ isOpen, onClose, darkMode }) => {
  const [activeTab, setActiveTab] = useState<TabType>('keys');
  const [keys, setKeys] = useState<DeveloperKey[]>([]);
  const [analytics, setAnalytics] = useState<DeveloperAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Key creation modal state
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyTier, setNewKeyTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);

  // Raw key revealed modal state (shown once)
  const [newlyCreatedRawKey, setNewlyCreatedRawKey] = useState<string | null>(null);
  const [copiedRawKey, setCopiedRawKey] = useState(false);

  // Playground state
  const [selectedEndpoint, setSelectedEndpoint] = useState<'/api/v1/ai/chat' | '/api/v1/youtube/search' | '/api/v1/usage' | '/api/v1/tts'>('/api/v1/usage');
  const [playgroundApiKey, setPlaygroundApiKey] = useState('');
  const [playgroundBody, setPlaygroundBody] = useState('{\n  "message": "Node.js দিয়ে ক্লাউড API কীভাবে ব্যবহার করব?",\n  "mode": "coding"\n}');
  const [playgroundQuery, setPlaygroundQuery] = useState('coke studio bangla');
  const [playgroundResponse, setPlaygroundResponse] = useState<string | null>(null);
  const [playgroundStatus, setPlaygroundStatus] = useState<number | null>(null);
  const [isPlayingTesting, setIsPlayingTesting] = useState(false);

  // Code snippet language
  const [codeLang, setCodeLang] = useState<CodeLang>('curl');
  const [copiedCode, setCopiedCode] = useState(false);

  // Mobile CCT & WebView guide state
  const [mobileFramework, setMobileFramework] = useState<'android-kotlin' | 'flutter' | 'react-native' | 'webview-fix' | 'twa-playstore'>('android-kotlin');
  const [mobileToolbarColor, setMobileToolbarColor] = useState('#0f766e');
  const [mobileTargetUrl, setMobileTargetUrl] = useState(
    typeof window !== 'undefined' ? window.location.href : 'https://remixaiassistant.web.app'
  );
  const [mobileEnvInfo, setMobileEnvInfo] = useState<BrowserEnvironmentInfo | null>(null);
  const [copiedMobileSnippet, setCopiedMobileSnippet] = useState<string | null>(null);

  // Fetch keys & analytics
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [keysRes, analyticsRes] = await Promise.all([
        fetch('/api/developer/keys'),
        fetch('/api/developer/analytics'),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        if (data.keys) {
          setKeys(data.keys);
          // Set first active key in playground if empty
          if (data.keys.length > 0 && !playgroundApiKey) {
            setPlaygroundApiKey(data.keys[0].keyPrefix.replace('...', ''));
          }
        }
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData.analytics) {
          setAnalytics(aData.analytics);
        }
      }
    } catch (err: any) {
      setErrorMsg('ডেভেলপার ডেটা লোড করতে সমস্যা হয়েছে: ' + (err?.message || err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setMobileEnvInfo(detectBrowserEnvironment());
      if (typeof window !== 'undefined' && window.location.href) {
        setMobileTargetUrl(window.location.href);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Create Key handler
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setIsSubmittingKey(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          tier: newKeyTier,
        }),
      });

      const data = await res.json();
      if (res.ok && data.rawKey) {
        setNewlyCreatedRawKey(data.rawKey);
        setPlaygroundApiKey(data.rawKey);
        setIsCreatingKey(false);
        setNewKeyName('');
        fetchData();
      } else {
        setErrorMsg(data.error || 'API Key তৈরি করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      setErrorMsg('সার্ভার যোগাযোগ ত্রুটি: ' + (err?.message || err));
    } finally {
      setIsSubmittingKey(false);
    }
  };

  // Revoke Key handler
  const handleRevokeKey = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে এই API Key-টি নিষ্ক্রিয় (Revoke) করতে চান? এরপর এটি দিয়ে আর কোনো রিকোয়েস্ট কাজ করবে না।')) {
      return;
    }
    try {
      const res = await fetch(`/api/developer/keys/${id}/revoke`, { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('API Key সফলভাবে নিষ্ক্রিয় করা হয়েছে।');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg('কী নিষ্ক্রিয় করতে ব্যর্থ: ' + err?.message);
    }
  };

  // Delete Key handler
  const handleDeleteKey = async (id: string) => {
    if (!confirm('আপনি কি সম্পূর্ণভাবে এই API Key রেকর্ডটি মুছে ফেলতে চান?')) {
      return;
    }
    try {
      const res = await fetch(`/api/developer/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg('API Key মুছে ফেলা হয়েছে।');
        setTimeout(() => setSuccessMsg(''), 4000);
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg('কী মুছতে ব্যর্থ: ' + err?.message);
    }
  };

  // Playground test request
  const handleRunPlayground = async () => {
    setIsPlayingTesting(true);
    setPlaygroundResponse(null);
    setPlaygroundStatus(null);
    try {
      let url = selectedEndpoint as string;
      const headers: Record<string, string> = {
        'x-api-key': playgroundApiKey.trim(),
      };
      let options: RequestInit = { headers };

      if (selectedEndpoint === '/api/v1/ai/chat') {
        options.method = 'POST';
        headers['Content-Type'] = 'application/json';
        options.body = playgroundBody;
      } else if (selectedEndpoint === '/api/v1/youtube/search') {
        url = `${selectedEndpoint}?query=${encodeURIComponent(playgroundQuery)}`;
        options.method = 'GET';
      } else if (selectedEndpoint === '/api/v1/tts') {
        url = `${selectedEndpoint}?text=${encodeURIComponent('স্বাগতম আমাদের ডেভেলপার ক্লাউড প্ল্যাটফর্মে')}&lang=bn`;
        options.method = 'GET';
      } else {
        options.method = 'GET';
      }

      const res = await fetch(url, options);
      setPlaygroundStatus(res.status);

      if (selectedEndpoint === '/api/v1/tts') {
        setPlaygroundResponse(JSON.stringify({ status: res.status, statusText: res.statusText, contentType: res.headers.get('content-type'), info: 'Audio stream received successfully (audio/mpeg)' }, null, 2));
      } else {
        const data = await res.json();
        setPlaygroundResponse(JSON.stringify(data, null, 2));
      }
      // Refresh analytics after a successful call
      fetchData();
    } catch (err: any) {
      setPlaygroundStatus(500);
      setPlaygroundResponse(JSON.stringify({ error: err?.message || 'রিকোয়েস্ট পাঠাতে ব্যর্থ' }, null, 2));
    } finally {
      setIsPlayingTesting(false);
    }
  };

  // Generate dynamic code snippet based on selected endpoint & language
  const getCodeSnippet = (lang: CodeLang): string => {
    const key = playgroundApiKey || 'sk_live_your_secret_api_key_here';
    const origin = window.location.origin;

    if (lang === 'curl') {
      if (selectedEndpoint === '/api/v1/ai/chat') {
        return `curl -X POST "${origin}/api/v1/ai/chat" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{
    "message": "Node.js দিয়ে ক্লাউড API কীভাবে ব্যবহার করব?",
    "mode": "coding"
  }'`;
      }
      if (selectedEndpoint === '/api/v1/youtube/search') {
        return `curl -X GET "${origin}/api/v1/youtube/search?query=new+song+bangla" \\
  -H "x-api-key: ${key}"`;
      }
      if (selectedEndpoint === '/api/v1/tts') {
        return `curl -X GET "${origin}/api/v1/tts?text=হ্যালো+বাংলাদেশ&lang=bn" \\
  -H "x-api-key: ${key}" \\
  --output voice.mp3`;
      }
      return `curl -X GET "${origin}/api/v1/usage" \\
  -H "x-api-key: ${key}"`;
    }

    if (lang === 'nodejs') {
      if (selectedEndpoint === '/api/v1/ai/chat') {
        return `// Node.js (Fetch API / Express)
const response = await fetch("${origin}/api/v1/ai/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${key}"
  },
  body: JSON.stringify({
    message: "Node.js দিয়ে ক্লাউড API কীভাবে ব্যবহার করব?",
    mode: "coding"
  })
});

const data = await response.json();
console.log("AI Response:", data.response);`;
      }
      return `// Node.js API Request
const res = await fetch("${origin}${selectedEndpoint}", {
  headers: {
    "x-api-key": "${key}"
  }
});
const data = await res.json();
console.log(data);`;
    }

    if (lang === 'python') {
      if (selectedEndpoint === '/api/v1/ai/chat') {
        return `# Python 3 (requests)
import requests

url = "${origin}/api/v1/ai/chat"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${key}"
}
payload = {
    "message": "Node.js দিয়ে ক্লাউড API কীভাবে ব্যবহার করব?",
    "mode": "coding"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print("AI Reply:", data.get("response"))`;
      }
      return `# Python 3
import requests

url = "${origin}${selectedEndpoint}"
headers = {"x-api-key": "${key}"}

response = requests.get(url, headers=headers)
print(response.json())`;
    }

    // PHP
    return `<?php
// PHP cURL
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${origin}${selectedEndpoint}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: ${key}",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data);
?>`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/25">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  ডেভেলপার API সার্ভিস ও SaaS প্ল্যাটফর্ম
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live v1.0
                </span>
              </div>
              <p className="text-xs text-stone-400">
                থার্ড-পার্টি অ্যাপ ও ডেভেলপারদের জন্য API Key ভ্যালিডেশন, রেট লিমিট ও ক্লাউড মাইক্রোসার্ভিস
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="তথ্য রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Alert / Toast message */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-stone-800 bg-stone-950/40 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('keys')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'keys'
                ? 'border-blue-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <Key className="w-4 h-4 text-blue-400" />
            <span>API Keys ম্যানেজমেন্ট</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-800 text-stone-300">
              {keys.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>লাইভ মেট্রিক্স ও লগস</span>
          </button>

          <button
            onClick={() => setActiveTab('playground')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'playground'
                ? 'border-blue-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>লাইভ টেস্ট প্লেগ্রাউন্ড</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'docs'
                ? 'border-blue-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            <span>ইন্টারেক্টিভ API ডক্স</span>
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'pricing'
                ? 'border-blue-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <CreditCard className="w-4 h-4 text-pink-400" />
            <span>প্ল্যান ও কোটা টিয়ার</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === 'mobile'
                ? 'border-cyan-500 text-white bg-stone-800/60 shadow-xs'
                : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-850/40'
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>মোবাইল CCT ও WebView গাইড</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              CCT Fix
            </span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: API KEYS MANAGEMENT */}
          {activeTab === 'keys' && (
            <div className="space-y-6">
              {/* Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-stone-900 border border-blue-500/20">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    নিরাপদ API Key সিস্টেম (SHA-256 Hashed)
                  </h3>
                  <p className="text-xs text-stone-300 max-w-xl">
                    সার্ভারে ক্লায়েন্টের আসল কী সংরক্ষিত থাকে না। SHA-256 হ্যাশের মাধ্যমে প্রতিটি রিকোয়েস্ট সুরক্ষিতভাবে অনুমোদিত ও রেট লিমিট পরিমাপ করা হয়।
                  </p>
                </div>
                <button
                  onClick={() => setIsCreatingKey(true)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন API Key তৈরি করুন</span>
                </button>
              </div>

              {/* Keys Table */}
              <div className="rounded-2xl border border-stone-800 bg-stone-950/50 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                    সক্রিয় সিক্রেট কিসমূহ ({keys.length})
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    হেডার: <code className="text-blue-400 font-mono">x-api-key: sk_live_...</code>
                  </span>
                </div>

                {keys.length === 0 ? (
                  <div className="p-8 text-center space-y-3">
                    <Key className="w-10 h-10 text-stone-600 mx-auto" />
                    <p className="text-xs text-stone-400">কোনো সক্রিয় API Key তৈরি করা হয়নি।</p>
                    <button
                      onClick={() => setIsCreatingKey(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
                    >
                      প্রথম কী তৈরি করুন
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-800/80 overflow-x-auto">
                    {keys.map((k) => {
                      const quotaPercent = Math.min(100, Math.round((k.usageCount / k.monthlyQuota) * 100));
                      return (
                        <div key={k.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-900/30 transition-colors">
                          <div className="space-y-1.5 min-w-[200px]">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-white">{k.keyName}</span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  k.status === 'active'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {k.status === 'active' ? 'Active' : 'Revoked'}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase">
                                {k.tier}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono text-stone-400">
                              <span>Prefix:</span>
                              <span className="px-2 py-0.5 rounded bg-stone-900 text-stone-200 border border-stone-800">
                                {k.keyPrefix}
                              </span>
                              <span className="text-[11px] text-stone-400">
                                (তৈরি: {new Date(k.createdAt).toLocaleDateString('bn-BD')})
                              </span>
                            </div>
                          </div>

                          {/* Quota & Rate Limit meters */}
                          <div className="flex-1 max-w-xs space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-stone-400">
                              <span>মাসিক ব্যবহার:</span>
                              <span className="font-semibold text-stone-200">
                                {k.usageCount.toLocaleString()} / {k.monthlyQuota.toLocaleString()} ({quotaPercent}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-stone-800 overflow-hidden">
                              <div
                                style={{ width: `${quotaPercent}%` }}
                                className={`h-full transition-all duration-500 ${
                                  quotaPercent > 90 ? 'bg-rose-500' : quotaPercent > 70 ? 'bg-amber-500' : 'bg-blue-500'
                                }`}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-stone-400">
                              <span>রেট লিমিট: {k.rateLimit} req/min</span>
                              {k.lastUsedAt && (
                                <span>সর্বশেষ ব্যবহার: {new Date(k.lastUsedAt).toLocaleTimeString('bn-BD')}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setPlaygroundApiKey(k.keyPrefix.replace('...', ''));
                                setActiveTab('playground');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                              title="প্লেগ্রাউন্ডে টেস্ট করুন"
                            >
                              টেস্ট করুন
                            </button>

                            {k.status === 'active' && (
                              <button
                                onClick={() => handleRevokeKey(k.id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                                title="কী সাময়িক নিষ্ক্রিয় করুন"
                              >
                                Revoke
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteKey(k.id)}
                              className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-400 text-xs transition-colors cursor-pointer"
                              title="কী চিরতরে মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* TAB 2: LIVE ANALYTICS & AUDIT LOGS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-stone-400 text-xs">
                    <span>মোট রিকোয়েস্ট</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {analytics?.totalCalls.toLocaleString() || '0'}
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ক্লাউড গেটওয়ে সক্রিয়</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-stone-400 text-xs">
                    <span>সফলতার হার (Success)</span>
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {analytics?.successRate ?? 100}%
                  </div>
                  <div className="text-[11px] text-stone-400">200 OK রেট</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-stone-400 text-xs">
                    <span>গড় রেসপন্স টাইম</span>
                    <Clock className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {analytics?.avgLatency ?? 85} ms
                  </div>
                  <div className="text-[11px] text-amber-400">আল্ট্রা-ফাস্ট লেটেন্সি</div>
                </div>

                <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-1">
                  <div className="flex items-center justify-between text-stone-400 text-xs">
                    <span>সক্রিয় ডেভেলপার কী</span>
                    <Key className="w-4 h-4 text-purple-400" />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {analytics?.activeKeysCount ?? 0}
                  </div>
                  <div className="text-[11px] text-stone-400">ক্লায়েন্ট অথেনটিকেটেড</div>
                </div>
              </div>

              {/* Real-time Audit Logs Table */}
              <div className="rounded-2xl border border-stone-800 bg-stone-950/60 overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between bg-stone-900/50">
                  <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    রিয়েল-টাইম API রিকোয়েস্ট অডিট লগ (সর্বশেষ ৫০টি)
                  </h4>
                  <span className="text-[11px] text-stone-400">অটো-লগিং সক্রিয়</span>
                </div>

                {(!analytics?.recentLogs || analytics.recentLogs.length === 0) ? (
                  <div className="p-8 text-center text-xs text-stone-400">
                    এখনও কোনো রিকোয়েস্ট লগ নেই। প্লেগ্রাউন্ড বা cURL দিয়ে কল করুন।
                  </div>
                ) : (
                  <div className="divide-y divide-stone-800/80 max-h-80 overflow-y-auto font-mono text-xs">
                    {analytics.recentLogs.map((log) => (
                      <div key={log.id} className="px-5 py-2.5 flex items-center justify-between gap-3 hover:bg-stone-900/30">
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.statusCode >= 200 && log.statusCode < 300
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : log.statusCode === 429
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {log.statusCode}
                          </span>
                          <span className="font-semibold text-stone-200">{log.method}</span>
                          <span className="text-blue-400 truncate max-w-[200px] sm:max-w-xs">{log.endpoint}</span>
                        </div>

                        <div className="flex items-center gap-4 text-stone-400 text-[11px]">
                          <span className="hidden sm:inline text-stone-400">{log.keyPrefix}</span>
                          <span className="text-stone-300 font-semibold">{log.responseTimeMs}ms</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString('bn-BD')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PLAYGROUND & TESTER */}
          {activeTab === 'playground' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request Configuration Panel */}
                <div className="p-5 rounded-2xl bg-stone-950/60 border border-stone-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      লাইভ API রিকোয়েস্ট কনফিগ
                    </h4>
                    <span className="text-[11px] text-stone-400">সার্ভারে লাইভ কল</span>
                  </div>

                  {/* Endpoint Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-300">API এন্ডপয়েন্ট নির্বাচন করুন:</label>
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="/api/v1/usage">GET /api/v1/usage (কী ভ্যালিডেশন ও কোটা চেক)</option>
                      <option value="/api/v1/ai/chat">POST /api/v1/ai/chat (এআই চ্যাট ও টেক্সট জেনারেশন)</option>
                      <option value="/api/v1/youtube/search">GET /api/v1/youtube/search (ইউটিউব ও গান সার্চ)</option>
                      <option value="/api/v1/tts">GET /api/v1/tts (টেক্সট-টু-স্পিচ অডিও)</option>
                    </select>
                  </div>

                  {/* API Key Header Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-stone-300">x-api-key হেডার:</label>
                    <input
                      type="text"
                      value={playgroundApiKey}
                      onChange={(e) => setPlaygroundApiKey(e.target.value)}
                      placeholder="sk_live_..."
                      className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono text-white placeholder-stone-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Body / Query params based on endpoint */}
                  {selectedEndpoint === '/api/v1/ai/chat' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-300">JSON Request Body:</label>
                      <textarea
                        rows={4}
                        value={playgroundBody}
                        onChange={(e) => setPlaygroundBody(e.target.value)}
                        className="w-full p-3 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono text-emerald-300 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {selectedEndpoint === '/api/v1/youtube/search' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-300">query প্যারামিটার:</label>
                      <input
                        type="text"
                        value={playgroundQuery}
                        onChange={(e) => setPlaygroundQuery(e.target.value)}
                        placeholder="new song bangla"
                        className="w-full px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <button
                    onClick={handleRunPlayground}
                    disabled={isPlayingTesting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isPlayingTesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>অনুরোধ প্রসেস হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>API কল পাঠান (Send Request)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Response Preview Panel */}
                <div className="p-5 rounded-2xl bg-stone-950/60 border border-stone-800 flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      সার্ভার রেসপন্স প্রিভিউ
                    </h4>
                    {playgroundStatus !== null && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          playgroundStatus >= 200 && playgroundStatus < 300
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        HTTP {playgroundStatus}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 bg-black/70 rounded-xl p-3 border border-stone-850 overflow-auto font-mono text-xs text-stone-200 min-h-[220px] max-h-[340px]">
                    {playgroundResponse ? (
                      <pre className="whitespace-pre-wrap">{playgroundResponse}</pre>
                    ) : (
                      <div className="h-full flex items-center justify-center text-stone-500 text-xs">
                        "API কল পাঠান" বাটনে চাপ দিলে এখানে রিয়েল-টাইম রেসপন্স আসবে।
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE DOCUMENTATION & CODE SNIPPETS */}
          {activeTab === 'docs' && (
            <div className="space-y-6">
              {/* Language Switcher */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-400">কোড স্নিপেট ভাষা:</span>
                  <div className="inline-flex rounded-xl bg-stone-950 border border-stone-800 p-0.5">
                    {(['curl', 'nodejs', 'python', 'php'] as CodeLang[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setCodeLang(lang)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer ${
                          codeLang === lang
                            ? 'bg-blue-600 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getCodeSnippet(codeLang));
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'কপি হয়েছে!' : 'কোড কপি করুন'}</span>
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="relative rounded-2xl bg-black/80 border border-stone-800 p-4 font-mono text-xs text-blue-300 overflow-x-auto shadow-inner">
                <pre>{getCodeSnippet(codeLang)}</pre>
              </div>

              {/* Endpoints Catalog */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  উপলব্ধ API সার্ভিস তালিকা
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono font-bold text-[10px]">
                          POST
                        </span>
                        <code className="text-xs font-bold text-white">/api/v1/ai/chat</code>
                      </div>
                      <span className="text-[11px] text-stone-400">Gemini 3.8 Flash</span>
                    </div>
                    <p className="text-xs text-stone-300">
                      উন্নত জেনারেটিভ এআই চ্যাট ও অ্যাসিস্ট্যান্স। প্যারামিটার: <code>message</code>, <code>mode</code> (coding, writing, research), <code>enableSearch</code> (Google Search Grounding)।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                          GET
                        </span>
                        <code className="text-xs font-bold text-white">/api/v1/youtube/search</code>
                      </div>
                      <span className="text-[11px] text-stone-400">Anti-typo engine</span>
                    </div>
                    <p className="text-xs text-stone-300">
                      ইউটিউব মিউজিক ও ভিডিও একুরেট সার্চ। টাইপো স্বয়ংক্রিয় সংশোধন করে আসল ট্র্যাক, থাম্বনেইল ও সময়সীমা প্রদান করে। প্যারামিটার: <code>query</code>।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                          GET
                        </span>
                        <code className="text-xs font-bold text-white">/api/v1/tts</code>
                      </div>
                      <span className="text-[11px] text-stone-400">Audio Stream (MP3)</span>
                    </div>
                    <p className="text-xs text-stone-300">
                      ন্যাচারাল বাংলা ও ইংরেজি ভয়েস অডিও স্ট্রিমিং। সরাসরি MP3 বাইনারি স্ট্রিম রিটার্ন করে। প্যারামিটার: <code>text</code>, <code>lang</code>।
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px]">
                          GET
                        </span>
                        <code className="text-xs font-bold text-white">/api/v1/usage</code>
                      </div>
                      <span className="text-[11px] text-stone-400">Auth & Quota</span>
                    </div>
                    <p className="text-xs text-stone-300">
                      আপনার প্রদানকৃত API Key-এর বৈধতা যাচাই, রেট লিমিট ও বর্তমান মাসিক কোটা জানার এন্ডপয়েন্ট।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PRICING & TIERS (MONETIZATION) */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  স্বচ্ছ কোটা ও ফ্লেক্সিবল ডেভেলপার প্ল্যান
                </h3>
                <p className="text-xs text-stone-400">
                  আপনার অ্যাপের চাহিদা অনুযায়ী পছন্দমতো টায়ার বেছে নিন। যেকোনো সময় আপগ্রেড করা যাবে।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Free Tier */}
                <div className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-300 uppercase">Starter</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300">ফ্রি</span>
                    </div>
                    <div className="text-2xl font-black text-white">৳০ <span className="text-xs font-normal text-stone-400">/ চিরকাল</span></div>
                    <ul className="text-xs text-stone-300 space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>১,০০০ রিকোয়েস্ট / মাস</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>৬০ রিকোয়েস্ট / মিনিট রেট লিমিট</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Gemini 3.8 Flash এআই মডেল</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>ইউটিউব ও টিটিএস সার্ভিস এক্সেস</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setNewKeyTier('free');
                      setIsCreatingKey(true);
                    }}
                    className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    ফ্রি কী তৈরি করুন
                  </button>
                </div>

                {/* Pro Tier (Popular) */}
                <div className="relative p-5 rounded-2xl bg-gradient-to-b from-blue-950/60 to-stone-950 border-2 border-blue-500/50 flex flex-col justify-between space-y-4 shadow-xl shadow-blue-500/10">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">
                    সর্বাধিক জনপ্রিয়
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-400 uppercase">Developer Pro</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">পেশাদার</span>
                    </div>
                    <div className="text-2xl font-black text-white">৳৯৯৯ <span className="text-xs font-normal text-stone-400">/ মাস</span></div>
                    <ul className="text-xs text-stone-200 space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>১,০০,০০০ রিকোয়েস্ট / মাস</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>৩০০ রিকোয়েস্ট / মিনিট রেট লিমিট</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>গুগল সার্চ গ্রাউন্ডিং সরাসরি সক্রিয়</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>লো-লেটেন্সি প্রায়োরিটি রুট</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>বিকাশ / নগদ / কার্ড সাপোর্ট</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setNewKeyTier('pro');
                      setIsCreatingKey(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all cursor-pointer"
                  >
                    Pro কী তৈরি করুন
                  </button>
                </div>

                {/* Enterprise */}
                <div className="p-5 rounded-2xl bg-stone-950/70 border border-stone-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400 uppercase">Enterprise</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300">কাস্টম</span>
                    </div>
                    <div className="text-2xl font-black text-white">কাস্টম <span className="text-xs font-normal text-stone-400">/ চুক্তিভিত্তিক</span></div>
                    <ul className="text-xs text-stone-300 space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>১০,০০,০০০+ রিকোয়েস্ট / মাস</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>৬০০+ রিকোয়েস্ট / মিনিট রেট</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>কাস্টম ডোমেইন ও ডেডিকেটেড ক্লাস্টার</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>৯৯.৯% আপটাইম SLA গ্যারান্টি</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={() => {
                      setNewKeyTier('enterprise');
                      setIsCreatingKey(true);
                    }}
                    className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Enterprise কী তৈরি করুন
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MOBILE CCT & IN-APP BROWSER INTEGRATION */}
          {activeTab === 'mobile' && (
            <div className="space-y-6">
              {/* Feature Highlights */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-stone-900 border border-cyan-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                        <Smartphone className="w-4 h-4" />
                      </span>
                      <h3 className="text-sm font-bold text-white">
                        Chrome Custom Tabs (CCT) & In-App Browser Integration
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        disallowed_useragent 403 Fix
                      </span>
                    </div>
                    <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                      মোবাইল বা হাইব্রিড অ্যাপে সাধারণ WebView ব্যবহার করলে গুগল সিকিউরিটির কারণে <code>403 disallowed_useragent</code> দিয়ে লগইন আটকে যায়। Chrome Custom Tabs (Android) ও SFSafariViewController (iOS) হলো গুগলের অফিশিয়াল ১০০% নির্ভুল সমাধান।
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openInExternalSystemBrowser(mobileTargetUrl)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/30 transition-all cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>ক্রোমে টেস্ট রান করুন</span>
                  </button>
                </div>

                {/* 4 Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      লগইন ফেইল করবে না
                    </span>
                    <p className="text-[10px] text-stone-300">
                      কোনো ব্লক বা এরর ছাড়াই Google OAuth ও Firebase সেশন নিশ্চিত করে।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      আসল ক্রোমের সাথে সিঙ্ক
                    </span>
                    <p className="text-[10px] text-stone-300">
                      ফোনের ক্রোম ব্রাউজারের অটোফিল, সেভড পাসওয়ার্ড ও কুকি স্বয়ংক্রিয়ভাবে শেয়ার হয়।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      অ্যাপের ভেতরেই ব্রাউজিং
                    </span>
                    <p className="text-[10px] text-stone-300">
                      অ্যাপ ছেড়ে বের না হয়ে অ্যাপের কালার ও থিমসহ ফুল-ফিচার ব্রাউজার ওপেন হয়।
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      পাসকি ও ওয়েবঅথন
                    </span>
                    <p className="text-[10px] text-stone-300">
                      ফিঙ্গারপ্রিন্ট ও বায়োমেট্রিক অথেন্টিকেশন এবং আধুনিক পাসকি সম্পূর্ণ কার্যকরী।
                    </p>
                  </div>
                </div>
              </div>

              {/* Live Device Environment Inspector */}
              {mobileEnvInfo && (
                <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-white">
                        আপনার বর্তমান ব্রাউজার রানটাইম স্ট্যাটাস
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        mobileEnvInfo.isOAuthSafe
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {mobileEnvInfo.isOAuthSafe ? '✓ Google OAuth Safe' : '⚠ In-App WebView Detected'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block">প্ল্যাটফর্ম:</span>
                      <span className="font-semibold text-stone-200">
                        {mobileEnvInfo.isAndroid ? 'Android OS' : mobileEnvInfo.isIOS ? 'iOS Apple' : 'Desktop Browser'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block">ওয়েবভিউ শনাক্ত:</span>
                      <span className={`font-semibold ${mobileEnvInfo.isWebView ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {mobileEnvInfo.isWebView ? mobileEnvInfo.inAppBrowserName || 'Embedded WebView' : 'স্বাভাবিক ব্রাউজার'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block">PWA / TWA স্টাইল:</span>
                      <span className="font-semibold text-stone-200">
                        {mobileEnvInfo.isStandalonePWA ? 'Standalone PWA/TWA' : 'ওয়েব ট্যাব'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800">
                      <span className="text-[10px] text-stone-400 block">রিকমেন্ডেশন:</span>
                      <span className="font-semibold text-cyan-300 text-[11px] truncate block">
                        {mobileEnvInfo.isOAuthSafe ? 'নিরাপদ' : 'Chrome-এ খুলুন'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const intent = getAndroidChromeIntentUrl(mobileTargetUrl);
                        navigator.clipboard.writeText(intent);
                        setCopiedMobileSnippet('intent');
                        setTimeout(() => setCopiedMobileSnippet(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedMobileSnippet === 'intent' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Android Chrome Intent URI কপি</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(mobileEnvInfo.userAgent);
                        setCopiedMobileSnippet('ua');
                        setTimeout(() => setCopiedMobileSnippet(null), 2500);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedMobileSnippet === 'ua' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>User-Agent স্ট্রিং কপি</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Parameters Customizer */}
              <div className="p-4 rounded-2xl bg-stone-950/40 border border-stone-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full space-y-1">
                  <label className="text-[11px] font-semibold text-stone-400 block">
                    টার্গেট ওয়েবসাইট লিঙ্ক (Target URL):
                  </label>
                  <input
                    type="text"
                    value={mobileTargetUrl}
                    onChange={(e) => setMobileTargetUrl(e.target.value)}
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
                      value={mobileToolbarColor}
                      onChange={(e) => setMobileToolbarColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={mobileToolbarColor}
                      onChange={(e) => setMobileToolbarColor(e.target.value)}
                      className="w-24 px-2 py-1 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Framework Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-stone-800">
                <button
                  type="button"
                  onClick={() => setMobileFramework('android-kotlin')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mobileFramework === 'android-kotlin'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Android Native (Kotlin)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFramework('flutter')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mobileFramework === 'flutter'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Flutter (Dart)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFramework('react-native')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mobileFramework === 'react-native'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  React Native (TS/JS)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFramework('twa-playstore')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mobileFramework === 'twa-playstore'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Play Store TWA (Bubblewrap)
                </button>
                <button
                  type="button"
                  onClick={() => setMobileFramework('webview-fix')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    mobileFramework === 'webview-fix'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  WebView UserAgent Fix
                </button>
              </div>

              {/* Code Blocks */}
              <div className="space-y-4">
                {mobileFramework === 'android-kotlin' && (
                  <>
                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ১. app/build.gradle ডিপেনডেন্সি:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('dependencies {\n    implementation "androidx.browser:browser:1.8.0"\n}');
                            setCopiedMobileSnippet('k-dep');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'k-dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কপি</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[12px] font-mono text-cyan-200">
                        <code>{`dependencies {\n    implementation "androidx.browser:browser:1.8.0"\n}`}</code>
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ২. Kotlin কোড (CustomTabsIntent):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = `fun openSecureBrowser(context: Context, url: String = "${mobileTargetUrl}") {\n    val builder = CustomTabsIntent.Builder()\n    builder.setToolbarColor(android.graphics.Color.parseColor("${mobileToolbarColor}"))\n    builder.setShowTitle(true)\n    builder.setShareState(CustomTabsIntent.SHARE_STATE_ON)\n    val customTabsIntent = builder.build()\n    customTabsIntent.intent.setPackage("com.android.chrome")\n    customTabsIntent.launchUrl(context, Uri.parse(url))\n}`;
                            navigator.clipboard.writeText(code);
                            setCopiedMobileSnippet('k-code');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'k-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কোড কপি</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto leading-relaxed">
                        <code>{`import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent

fun openSecureBrowser(context: Context, url: String = "${mobileTargetUrl}") {
    val builder = CustomTabsIntent.Builder()
    
    // অ্যাপের থিমের সাথে মিলিয়ে টুলবারের কালার দিন
    builder.setToolbarColor(android.graphics.Color.parseColor("${mobileToolbarColor}"))
    
    // এনিমেশন এবং শেয়ার বাটন চালু করুন
    builder.setShowTitle(true)
    builder.setShareState(CustomTabsIntent.SHARE_STATE_ON)

    val customTabsIntent = builder.build()
    customTabsIntent.intent.setPackage("com.android.chrome")
    customTabsIntent.launchUrl(context, Uri.parse(url))
}`}</code>
                      </pre>
                    </div>
                  </>
                )}

                {mobileFramework === 'flutter' && (
                  <>
                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ১. pubspec.yaml ডিপেনডেন্সি:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('dependencies:\n  flutter_custom_tabs: ^2.1.0');
                            setCopiedMobileSnippet('f-dep');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'f-dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কপি</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[12px] font-mono text-cyan-200">
                        <code>{`dependencies:\n  flutter_custom_tabs: ^2.1.0`}</code>
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ২. Flutter Dart কোড:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = `import 'package:flutter/material.dart';\nimport 'package:flutter_custom_tabs/flutter_custom_tabs.dart';\n\nFuture<void> launchInAppChrome(BuildContext context, {String targetUrl = "${mobileTargetUrl}"}) async {\n  try {\n    await launchUrl(\n      Uri.parse(targetUrl),\n      customTabsOptions: CustomTabsOptions(\n        colorSchemes: CustomTabsColorSchemes.defaults(\n          toolbarColor: const Color(0xFF${mobileToolbarColor.replace('#', '')}),\n        ),\n        shareState: CustomTabsShareState.on,\n        urlBarHidingEnabled: true,\n        showTitle: true,\n      ),\n      safariViewControllerOptions: const SafariViewControllerOptions(\n        preferredBarTintColor: Color(0xFF${mobileToolbarColor.replace('#', '')}),\n        preferredControlTintColor: Colors.white,\n        dismissButtonStyle: SafariViewControllerDismissButtonStyle.close,\n      ),\n    );\n  } catch (e) {\n    debugPrint("Browser Error: \$e");\n  }\n}`;
                            navigator.clipboard.writeText(code);
                            setCopiedMobileSnippet('f-code');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'f-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কোড কপি</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto leading-relaxed">
                        <code>{`import 'package:flutter/material.dart';
import 'package:flutter_custom_tabs/flutter_custom_tabs.dart';

Future<void> launchInAppChrome(BuildContext context, {String targetUrl = "${mobileTargetUrl}"}) async {
  try {
    await launchUrl(
      Uri.parse(targetUrl),
      customTabsOptions: CustomTabsOptions(
        colorSchemes: CustomTabsColorSchemes.defaults(
          toolbarColor: const Color(0xFF${mobileToolbarColor.replace('#', '')}),
        ),
        shareState: CustomTabsShareState.on,
        urlBarHidingEnabled: true,
        showTitle: true,
      ),
      safariViewControllerOptions: const SafariViewControllerOptions(
        preferredBarTintColor: Color(0xFF${mobileToolbarColor.replace('#', '')}),
        preferredControlTintColor: Colors.white,
        dismissButtonStyle: SafariViewControllerDismissButtonStyle.close,
      ),
    );
  } catch (e) {
    debugPrint("Browser Error: \$e");
  }
}`}</code>
                      </pre>
                    </div>
                  </>
                )}

                {mobileFramework === 'react-native' && (
                  <>
                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ১. npm প্যাকেজ ইনস্টলেশন:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('npm install react-native-inappbrowser-reborn');
                            setCopiedMobileSnippet('rn-dep');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'rn-dep' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কপি</span>
                        </button>
                      </div>
                      <pre className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[12px] font-mono text-cyan-200">
                        <code>npm install react-native-inappbrowser-reborn</code>
                      </pre>
                    </div>

                    <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-200">
                          ২. React Native কোড:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const code = `import { Linking } from 'react-native';\nimport { InAppBrowser } from 'react-native-inappbrowser-reborn';\n\nconst openSafeChromeBrowser = async (url = '${mobileTargetUrl}') => {\n  try {\n    if (await InAppBrowser.isAvailable()) {\n      await InAppBrowser.open(url, {\n        // iOS Properties\n        dismissButtonStyle: 'cancel',\n        preferredBarTintColor: '${mobileToolbarColor}',\n        preferredControlTintColor: 'white',\n        // Android Properties\n        showTitle: true,\n        toolbarColor: '${mobileToolbarColor}',\n        secondaryToolbarColor: 'black',\n        enableUrlBarHiding: true,\n        enableDefaultShare: true,\n        forceCloseOnRedirection: false,\n      });\n    } else {\n      Linking.openURL(url);\n    }\n  } catch (error) {\n    console.error(error.message);\n  }\n};`;
                            navigator.clipboard.writeText(code);
                            setCopiedMobileSnippet('rn-code');
                            setTimeout(() => setCopiedMobileSnippet(null), 2500);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                        >
                          {copiedMobileSnippet === 'rn-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>কোড কপি</span>
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto leading-relaxed">
                        <code>{`import { Linking } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';

const openSafeChromeBrowser = async (url = '${mobileTargetUrl}') => {
  try {
    if (await InAppBrowser.isAvailable()) {
      await InAppBrowser.open(url, {
        // iOS Properties
        dismissButtonStyle: 'cancel',
        preferredBarTintColor: '${mobileToolbarColor}',
        preferredControlTintColor: 'white',
        // Android Properties
        showTitle: true,
        toolbarColor: '${mobileToolbarColor}',
        secondaryToolbarColor: 'black',
        enableUrlBarHiding: true,
        enableDefaultShare: true,
        forceCloseOnRedirection: false,
      });
    } else {
      Linking.openURL(url);
    }
  } catch (error) {
    console.error(error.message);
  }
};`}</code>
                      </pre>
                    </div>
                  </>
                )}

                {mobileFramework === 'webview-fix' && (
                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        Android WebView UserAgent Fix (wv ও Version স্ট্রিপিং):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = `// Android WebView UserAgent Fix:\nval webSettings = myWebView.settings\nwebSettings.javaScriptEnabled = true\nwebSettings.domStorageEnabled = true\n\n// ডিফল্ট UserAgent থেকে "wv" বাদ দিয়ে পিওর ক্রোম ইউজার এজেন্ট বানিয়ে দিন:\nval defaultUserAgent = webSettings.userAgentString\nwebSettings.userAgentString = defaultUserAgent.replace("; wv", "")`;
                          navigator.clipboard.writeText(code);
                          setCopiedMobileSnippet('wv-code');
                          setTimeout(() => setCopiedMobileSnippet(null), 2500);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        {copiedMobileSnippet === 'wv-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>কোড কপি</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto leading-relaxed">
                      <code>{`// Android WebView UserAgent Fix:
val webSettings = myWebView.settings
webSettings.javaScriptEnabled = true
webSettings.domStorageEnabled = true

// ডিফল্ট UserAgent থেকে "; wv" বাদ দিয়ে পিওর ক্রোম ইউজার এজেন্ট বানিয়ে দিন:
val defaultUserAgent = webSettings.userAgentString
webSettings.userAgentString = defaultUserAgent.replace("; wv", "")`}</code>
                    </pre>
                  </div>
                )}

                {mobileFramework === 'twa-playstore' && (
                  <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-cyan-300">
                        Google Play Store TWA (Trusted Web Activity) ব্লুপ্রিন্ট:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const code = `npm i -g @bubblewrap/cli\nbubblewrap init --manifest="${mobileTargetUrl.replace(/\/$/, '')}/manifest.webmanifest"\nbubblewrap build`;
                          navigator.clipboard.writeText(code);
                          setCopiedMobileSnippet('twa-code');
                          setTimeout(() => setCopiedMobileSnippet(null), 2500);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        {copiedMobileSnippet === 'twa-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>কমান্ড কপি</span>
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto leading-relaxed">
                      <code>{`# Bubblewrap CLI দিয়ে PWA-কে সরাসরি Android App Bundle (.aab)-এ রূপান্তর করুন:
npm i -g @bubblewrap/cli
bubblewrap init --manifest="${mobileTargetUrl.replace(/\/$/, '')}/manifest.webmanifest"
bubblewrap build

# TWA ব্যাকগ্রাউন্ডে স্বয়ংক্রিয়ভাবে Chrome Custom Tabs আর্কিটেকচার ব্যবহার করে
# ফলে গুগল সাইন-ইন কোনো প্রকার disallowed_useragent এরর ছাড়াই কাজ করে।`}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Key Dialog Modal Overlay */}
        {isCreatingKey && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-md p-6 rounded-3xl bg-stone-900 border border-stone-850 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">নতুন API Secret Key তৈরি</h3>
                </div>
                <button
                  onClick={() => setIsCreatingKey(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">কী-এর নাম বা লেবেল:</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="যেমন: Mobile App, Production Server, Client Site"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300">প্ল্যান টায়ার (Tier):</label>
                  <select
                    value={newKeyTier}
                    onChange={(e) => setNewKeyTier(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="free">Starter Free (১,০০০ রিকোয়েস্ট, ৬০ req/min)</option>
                    <option value="pro">Developer Pro (১,০০,০০০ রিকোয়েস্ট, ৩০০ req/min)</option>
                    <option value="enterprise">Enterprise (১০,০০,০০০ রিকোয়েস্ট, ৬০০ req/min)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                    <span>আন্তর্জাতিক মানদণ্ডের নিরাপত্তা</span>
                  </div>
                  <p>
                    কী তৈরি হলে এটি একবারই দেখানো হবে। ডাটাবেসে SHA-256 হ্যাশ সংরক্ষিত থাকবে।
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingKey(false)}
                    className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-semibold hover:bg-stone-750"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingKey || !newKeyName.trim()}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSubmittingKey ? 'কী তৈরি হচ্ছে...' : 'তৈরি নিশ্চিত করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Revealed Raw Key Modal (Security One-Time Display) */}
        {newlyCreatedRawKey && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <div className="w-full max-w-lg p-6 rounded-3xl bg-stone-900 border-2 border-emerald-500/50 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">API Secret Key তৈরি সফল হয়েছে!</h3>
                  <p className="text-xs text-stone-400">নিচের সিক্রেট কী-টি এখনই কপি করে সংরক্ষণ করুন</p>
                </div>
              </div>

              {/* Warning Alert */}
              <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">গুরুত্বপূর্ণ নিরাপত্তা নির্দেশিকা:</div>
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    সুরক্ষার খাতিরে এই সিক্রেট কী-টি আপনাকে <strong>কেবল এই একবারই</strong> দেখানো হচ্ছে। এটি হারিয়ে গেলে পুনরায় দেখা সম্ভব হবে না; নতুন কী তৈরি করতে হবে।
                  </p>
                </div>
              </div>

              {/* Raw Key Display Box */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-300">আপনার Secret API Key:</label>
                <div className="p-3 rounded-xl bg-black border border-stone-800 font-mono text-xs text-emerald-400 break-all select-all flex items-center justify-between gap-2">
                  <span>{newlyCreatedRawKey}</span>
                </div>
              </div>

              {/* Copy & Close Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newlyCreatedRawKey);
                    setCopiedRawKey(true);
                    setTimeout(() => setCopiedRawKey(false), 2500);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  {copiedRawKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedRawKey ? 'কপি সম্পন্ন হয়েছে!' : 'কী টি কপি করুন'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewlyCreatedRawKey(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  আমি কী-টি সংরক্ষণ করেছি (বন্ধ করুন)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
