import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Rocket,
  FolderGit2,
  Sparkles,
  MessageSquare,
  Mail,
  Send,
  TrendingUp,
  GraduationCap,
  Search,
  Copy,
  Check,
  Phone,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Lightbulb,
  Target,
  ShieldCheck,
  FileText,
  ArrowRight,
  Users,
  BookMarked,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/apiAuth';
import { sendGmailMessage, createGmailDraft, parseEmailRecipients } from '../lib/gmailService';
import { GoogleSignInButton } from './GoogleSignInButton';
import { GmailConfirmModal, GmailConfirmItem } from './GmailConfirmModal';

export interface GitHubRepoSummary {
  id: number | string;
  name: string;
  html_url: string;
  description: string | null;
  language?: string;
  stargazers_count?: number;
}

interface BusinessIdea {
  title: string;
  businessModel: string;
  targetAudience: string;
  pricingStrategy: string;
  revenuePotential: string;
  firstSteps: string;
}

interface SmsTemplate {
  label: string;
  language: string;
  message: string;
}

interface EmailCampaign {
  idealRecipientPersona: string;
  subjectBn: string;
  bodyBn: string;
  subjectEn: string;
  bodyEn: string;
}

interface MarketingPlaybook {
  headline: string;
  channels: string[];
  weeklyActionPlan: string[];
  growthTactics: string[];
}

interface BusinessLessonSnippet {
  topicTitle: string;
  keyTakeaways: string[];
  practicalAdvice: string;
}

export interface GeneratedBusinessCampaign {
  repoName: string;
  repoUrl?: string;
  generatedAt: number;
  summaryBn: string;
  businessIdeas: BusinessIdea[];
  smsTemplates: SmsTemplate[];
  emailCampaign: EmailCampaign;
  marketingPlaybook: MarketingPlaybook;
  businessLesson: BusinessLessonSnippet;
}

interface LearnLesson {
  title: string;
  overview: string;
  coreConcepts: Array<{
    heading: string;
    explanation: string;
    example: string;
  }>;
  actionChecklist: string[];
  proTip: string;
}

interface DispatchLogItem {
  id: string;
  to: string;
  subject: string;
  repoName: string;
  mode: 'send' | 'draft';
  gmailId: string;
  timestamp: number;
}

interface GitHubBusinessHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRepo?: GitHubRepoSummary | null;
  onSendToChat?: (prompt: string) => void;
  onOpenPulseSms?: () => void;
  onOpenEmailComposer?: (config?: {
    recipient?: string;
    subject?: string;
    body?: string;
    language?: 'bn' | 'en';
  }) => void;
  onOpenTemplatesLibrary?: (draft?: {
    title?: string;
    category?: 'Marketing' | 'Collaboration' | 'Follow-up';
    language?: 'bn' | 'en';
    subject?: string;
    body?: string;
    recipientHint?: string;
  }) => void;
  injectedTemplate?: {
    subject: string;
    body: string;
    language: 'bn' | 'en';
    recipientHint?: string;
    appliedAt: number;
  } | null;
}

type HubTab = 'ideas' | 'sms' | 'gmail' | 'marketing' | 'learn';

const CAMPAIGNS_STORAGE_KEY = 'ai_studio_github_business_campaigns_v1';
const DISPATCH_LOG_KEY = 'ai_studio_gmail_dispatch_logs_v1';

const FALLBACK_REPOS: GitHubRepoSummary[] = [
  {
    id: 1,
    name: 'PayHub-Gateway-Gmail-Disbursement-PWA',
    html_url: 'https://github.com/rsk934128-dot/PayHub-Gateway-Gmail-Disbursement-PWA',
    description: 'PayHub Gateway & Gmail Disbursement PWA — অফলাইন-ফার্স্ট পেমেন্ট গেটওয়ে ও পে-রোল ম্যানেজমেন্ট।',
    language: 'TypeScript',
    stargazers_count: 7,
  },
  {
    id: 2,
    name: 'Stripe-Gmail-Payment-Gateway-Hub',
    html_url: 'https://github.com/rsk934128-dot/Stripe-Gmail-Payment-Gateway-Hub',
    description: 'Stripe & Gmail Payment Gateway Hub — সিকিউর পেমেন্ট গেটওয়ে এবং অটোমেটেড জিমেইল রিসিট ডিসবার্সমেন্ট সিস্টেম।',
    language: 'JavaScript',
    stargazers_count: 6,
  },
  {
    id: 3,
    name: 'Sheikh-Farid-AI-Studio-Project-Hub',
    html_url: 'https://github.com/rsk934128-dot/Sheikh-Farid-AI-Studio-Project-Hub',
    description: 'শেখ ফরিদ AI Studio & Project Hub — মাল্টি-রিপোজিটরি ইকোসিস্টেম ও প্রজেক্ট কোঅর্ডিনেশন হাব।',
    language: 'TypeScript',
    stargazers_count: 4,
  },
  {
    id: 4,
    name: 'AI-Assistant-Coding-Studio',
    html_url: 'https://github.com/rsk934128-dot/AI-Assistant-Coding-Studio',
    description: 'AI-Assistant-Coding-Studio — ফ্ল্যাগশিপ রিয়েল-টাইম কোডিং সহকারী, লাইভ কম্পাইলার ও ক্লাউড সিঙ্ক।',
    language: 'TypeScript',
    stargazers_count: 12,
  },
  {
    id: 5,
    name: 'DeepMind-Science-Discovery-Workbench',
    html_url: 'https://github.com/rsk934128-dot/DeepMind-Science-Discovery-Workbench',
    description: 'DeepMind Science Discovery Workbench — অত্যাধুনিক বৈজ্ঞানিক গবেষণা, প্রোটিন মডেলিং ও সিমুলেশন প্ল্যাটফর্ম।',
    language: 'TypeScript',
    stargazers_count: 5,
  },
  {
    id: 6,
    name: 'No-IP-DNS-Remote-Access',
    html_url: 'https://github.com/rsk934128-dot/No-IP-DNS-Remote-Access',
    description: 'No-IP ডায়নামিক ডিএনএস ও রিমোট সার্ভার অ্যাক্সেস অটোমেশন টুলকিট।',
    language: 'Shell',
    stargazers_count: 3,
  },
];

const CURRICULUM_TOPICS = [
  {
    id: 'saas-pricing',
    title: '💰 সফটওয়্যার ও SaaS প্রাইসিং মডেল',
    desc: 'সাবস্ক্রিপশন, হোয়াইট-লেবেল লাইসেন্স ও এককালীন সেটআপ ফি নির্ধারণ',
  },
  {
    id: 'cold-gmail',
    title: '📧 B2B কোল্ড Gmail ও অটো-আউটরিচ',
    desc: 'ক্লায়েন্টের কাছে হাই-কনভার্টিং প্রোপোজাল ইমেইল লেখার ও পাঠানোর নিয়ম',
  },
  {
    id: 'sms-funnel',
    title: '💬 SMS ও WhatsApp মার্কেটিং ফানেল',
    desc: 'সংক্ষিপ্ত আকর্ষণীয় মেসেজে দ্রুত সাড়া ও লিড কনভার্সন বাড়ানো',
  },
  {
    id: 'github-monetize',
    title: '🚀 GitHub প্রজেক্ট থেকে আয় করার ৫ উপায়',
    desc: 'ওপেন সোর্স কোডকে প্রোডাক্ট, API সার্ভিস ও এজেন্সি প্যাকেজে রূপান্তর',
  },
  {
    id: 'bd-global-marketing',
    title: '📈 বাংলাদেশ ও গ্লোবাল মার্কেটে সেলস ও মার্কেটিং',
    desc: 'Facebook, LinkedIn, Fiverr/Upwork ও লোকাল বিজনেসে সফটওয়্যার বিক্রি',
  },
  {
    id: 'retention-scale',
    title: '🔄 কাস্টমার রিটেনশন ও ব্যবসা বড় করা',
    desc: 'প্রথম ১০ ক্লায়েন্ট থেকে ১০০+ রিকারিং কাস্টমারে যাওয়ার রোডম্যাপ',
  },
];

export const GitHubBusinessHubModal: React.FC<GitHubBusinessHubModalProps> = ({
  isOpen,
  onClose,
  initialRepo,
  onSendToChat,
  onOpenPulseSms,
  onOpenEmailComposer,
  onOpenTemplatesLibrary,
  injectedTemplate,
}) => {
  const { user, gmailAccessToken, isGmailConnected, signInWithGmail, disconnectGmail, authError, clearAuthError } = useAuth();

  const [activeTab, setActiveTab] = useState<HubTab>('ideas');
  const [repos, setRepos] = useState<GitHubRepoSummary[]>(FALLBACK_REPOS);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoSummary>(FALLBACK_REPOS[0]);

  // Custom Market / Goal Inputs
  const [targetMarket, setTargetMarket] = useState('বাংলাদেশ ও গ্লোবাল B2B ক্লায়েন্ট');
  const [focusGoal, setFocusGoal] = useState('SaaS সাবস্ক্রিপশন, হোয়াইট-লেবেল বিক্রি ও অটোমেটেড ক্লায়েন্ট আউটরিচ');

  // Campaigns Cache by Repo Name
  const [campaignsByRepo, setCampaignsByRepo] = useState<Record<string, GeneratedBusinessCampaign>>(() => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  const [isGeneratingCampaign, setIsGeneratingCampaign] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // SMS Editor State
  const [smsPhone, setSmsPhone] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Automated Gmail State
  const [emailLang, setEmailLang] = useState<'bn' | 'en'>('bn');
  const [gmailRecipientsInput, setGmailRecipientsInput] = useState('');
  const [gmailSubject, setGmailSubject] = useState('');
  const [gmailBody, setGmailBody] = useState('');
  const [selectedBatchRepos, setSelectedBatchRepos] = useState<string[]>([]);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    mode: 'send' | 'draft';
    items: Array<GmailConfirmItem & { fullBody: string; repoName: string }>;
  } | null>(null);
  const [isSendingGmail, setIsSendingGmail] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(DISPATCH_LOG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Business Learning State
  const [learnQuestion, setLearnQuestion] = useState('');
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [learnLesson, setLearnLesson] = useState<LearnLesson | null>(null);
  const [learnError, setLearnError] = useState<string | null>(null);

  const currentCampaign = campaignsByRepo[selectedRepo.name] || null;

  // Fetch live GitHub repos when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    const loadRepos = async () => {
      setIsLoadingRepos(true);
      try {
        const res = await fetch('/api/github/repos');
        if (active && res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setRepos(data);
            if (!initialRepo) {
              setSelectedRepo((prev) => data.find((r: GitHubRepoSummary) => r.name === prev?.name) || data[0]);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load live GitHub repos:', err);
      } finally {
        if (active) setIsLoadingRepos(false);
      }
    };
    loadRepos();
    return () => {
      active = false;
    };
  }, [isOpen, initialRepo]);

  // Apply initialRepo if passed
  useEffect(() => {
    if (isOpen && initialRepo) {
      setSelectedRepo(initialRepo);
      setActiveTab('ideas');
    }
  }, [isOpen, initialRepo]);

  // Sync SMS and Gmail editor fields when selectedRepo, campaign, or emailLang changes
  useEffect(() => {
    if (!currentCampaign) return;
    if (currentCampaign.smsTemplates?.length > 0) {
      setSmsBody(currentCampaign.smsTemplates[0].message);
    }
    if (currentCampaign.emailCampaign) {
      if (emailLang === 'bn') {
        setGmailSubject(currentCampaign.emailCampaign.subjectBn);
        setGmailBody(currentCampaign.emailCampaign.bodyBn);
      } else {
        setGmailSubject(currentCampaign.emailCampaign.subjectEn);
        setGmailBody(currentCampaign.emailCampaign.bodyEn);
      }
    }
  }, [selectedRepo.name, currentCampaign, emailLang]);

  // Apply template chosen from EmailTemplatesLibraryModal
  useEffect(() => {
    if (!injectedTemplate) return;
    setEmailLang(injectedTemplate.language);
    setGmailSubject(injectedTemplate.subject);
    setGmailBody(injectedTemplate.body);
    if (injectedTemplate.recipientHint && !gmailRecipientsInput.trim()) {
      setGmailRecipientsInput(injectedTemplate.recipientHint);
    }
    setActiveTab('gmail');
  }, [injectedTemplate?.appliedAt]);

  const filteredRepos = useMemo(() => {
    const q = repoSearch.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
    );
  }, [repos, repoSearch]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {}
  };

  // Call Backend Gemini to generate Business Ideas, SMS, Automated Gmail, Marketing & Business Insight
  const handleGenerateCampaign = async (repoToUse: GitHubRepoSummary = selectedRepo) => {
    setIsGeneratingCampaign(true);
    setGenerationError(null);
    try {
      const res = await authenticatedFetch('/api/business/generate-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoName: repoToUse.name,
          repoUrl: repoToUse.html_url,
          description: repoToUse.description || '',
          language: repoToUse.language || '',
          targetMarket,
          focusGoal,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.campaign) {
        throw new Error(data.error || 'বিজনেস ক্যাম্পেইন তৈরি করা যায়নি।');
      }

      const fullCampaign: GeneratedBusinessCampaign = {
        ...data.campaign,
        repoName: repoToUse.name,
        repoUrl: repoToUse.html_url,
        generatedAt: data.generatedAt || Date.now(),
      };

      const nextMap = {
        ...campaignsByRepo,
        [repoToUse.name]: fullCampaign,
      };
      setCampaignsByRepo(nextMap);
      try {
        localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(nextMap));
      } catch {}
    } catch (err: any) {
      setGenerationError(err?.message || 'আইডিয়া জেনারেশনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsGeneratingCampaign(false);
    }
  };

  useEffect(() => {
    if (isOpen && authError) {
      setGmailStatus({ type: 'error', message: authError });
      clearAuthError();
    }
  }, [isOpen, authError, clearAuthError]);

  // Connect Gmail OAuth
  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setGmailStatus(null);
    try {
      const token = await signInWithGmail();
      if (!token) {
        setGmailStatus((prev) => prev || { type: 'error', message: 'Gmail সংযোগ সম্পন্ন হয়নি। অনুগ্রহ করে পপআপে অনুমতি দিন।' });
      }
    } catch (err: any) {
      setGmailStatus({ type: 'error', message: err?.message || 'Gmail সংযোগে ত্রুটি।' });
    } finally {
      setIsConnectingGmail(false);
    }
  };

  // Trigger Confirmation Modal for Current Project OR Multi-Project Auto Gmail Batch
  const handlePrepareGmailDispatch = async (mode: 'send' | 'draft', isBatchRepos = false) => {
    setGmailStatus(null);
    const recipients = parseEmailRecipients(gmailRecipientsInput);

    if (mode === 'send' && recipients.length === 0) {
      setGmailStatus({
        type: 'error',
        message: 'সরাসরি Gmail পাঠাতে অনুগ্রহ করে উপরে অন্তত একটি বৈধ প্রাপক ইমেইল ঠিকানা লিখুন।',
      });
      return;
    }

    const queueItems: Array<GmailConfirmItem & { fullBody: string; repoName: string }> = [];

    if (isBatchRepos && selectedBatchRepos.length > 0) {
      const targetList = recipients.length > 0 ? recipients : [''];
      for (const rName of selectedBatchRepos) {
        const camp = campaignsByRepo[rName];
        if (!camp?.emailCampaign) continue;
        const subj = emailLang === 'bn' ? camp.emailCampaign.subjectBn : camp.emailCampaign.subjectEn;
        const bdy = emailLang === 'bn' ? camp.emailCampaign.bodyBn : camp.emailCampaign.bodyEn;
        for (const toAddr of targetList) {
          queueItems.push({
            to: toAddr,
            subject: subj,
            bodyPreview: bdy,
            fullBody: bdy,
            projectLabel: rName,
            repoName: rName,
          });
        }
      }
    } else {
      if (!gmailSubject.trim() && !gmailBody.trim()) {
        setGmailStatus({
          type: 'error',
          message: 'আগে প্রজেক্টের জন্য ইমেইল জেনারেট করুন অথবা বিষয় ও বার্তা লিখুন।',
        });
        return;
      }
      const targetList = mode === 'send' ? recipients : recipients.length > 0 ? recipients : [''];
      for (const toAddr of targetList) {
        queueItems.push({
          to: toAddr,
          subject: gmailSubject.trim() || `${selectedRepo.name} — Business Proposal`,
          bodyPreview: gmailBody.trim(),
          fullBody: gmailBody.trim(),
          projectLabel: selectedRepo.name,
          repoName: selectedRepo.name,
        });
      }
    }

    if (queueItems.length === 0) {
      setGmailStatus({
        type: 'error',
        message: 'পাঠানোর জন্য কোনো ক্যাম্পেইন প্রস্তুত নেই। আগে প্রজেক্টের জন্য AI ক্যাম্পেইন জেনারেট করুন।',
      });
      return;
    }

    if (!gmailAccessToken) {
      setIsConnectingGmail(true);
      try {
        const token = await signInWithGmail();
        if (!token) {
          setGmailStatus({
            type: 'error',
            message: 'সরাসরি Gmail পাঠাতে অনুগ্রহ করে আগে Sign in with Google বাটনে অনুমতি দিন।',
          });
          return;
        }
      } finally {
        setIsConnectingGmail(false);
      }
    }

    setConfirmState({ mode, items: queueItems });
  };

  // Execute confirmed Gmail sends / drafts
  const handleConfirmDispatch = async () => {
    if (!confirmState) return;
    let activeToken = gmailAccessToken;
    if (!activeToken) {
      activeToken = await signInWithGmail();
      if (!activeToken) {
        setConfirmState(null);
        return;
      }
    }

    setIsSendingGmail(true);
    setGmailStatus(null);
    const newLogs: DispatchLogItem[] = [];

    try {
      for (const item of confirmState.items) {
        if (confirmState.mode === 'draft') {
          const res = await createGmailDraft(activeToken, {
            from: user?.email || undefined,
            to: item.to,
            subject: item.subject,
            body: item.fullBody,
          });
          newLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            to: item.to || 'ড্রাফট',
            subject: item.subject,
            repoName: item.repoName,
            mode: 'draft',
            gmailId: res.id,
            timestamp: Date.now(),
          });
        } else {
          const res = await sendGmailMessage(activeToken, {
            from: user?.email || undefined,
            to: item.to,
            subject: item.subject,
            body: item.fullBody,
          });
          newLogs.push({
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            to: item.to,
            subject: item.subject,
            repoName: item.repoName,
            mode: 'send',
            gmailId: res.id,
            timestamp: Date.now(),
          });
        }
      }

      const updatedLogs = [...newLogs, ...dispatchLogs].slice(0, 30);
      setDispatchLogs(updatedLogs);
      try {
        localStorage.setItem(DISPATCH_LOG_KEY, JSON.stringify(updatedLogs));
      } catch {}

      setGmailStatus({
        type: 'success',
        message:
          confirmState.mode === 'draft'
            ? `${newLogs.length}টি Gmail ড্রাফট সফলভাবে আপনার অ্যাকাউন্টে সংরক্ষিত হয়েছে!`
            : `${newLogs.length}টি অটোমেটেড Gmail সফলভাবে প্রাপকদের কাছে পাঠানো হয়েছে!`,
      });
      setConfirmState(null);
    } catch (err: any) {
      const msg = err?.message || 'Gmail প্রেরণ ব্যর্থ হয়েছে।';
      if (msg.includes('401') || msg.includes('403')) {
        disconnectGmail();
      }
      setGmailStatus({ type: 'error', message: msg });
      setConfirmState(null);
    } finally {
      setIsSendingGmail(false);
    }
  };

  // Interactive Business Learning Fetch
  const handleLearnTopic = async (topicTitle?: string) => {
    const query = (topicTitle || learnQuestion).trim();
    if (!query) return;

    setIsLoadingLesson(true);
    setLearnError(null);
    try {
      const res = await authenticatedFetch('/api/business/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicTitle || '',
          question: query,
          projectName: selectedRepo.name,
          projectDescription: selectedRepo.description || '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.lesson) {
        throw new Error(data.error || 'বিজনেস লার্নিং লেসন লোড করা যায়নি।');
      }
      setLearnLesson(data.lesson);
    } catch (err: any) {
      setLearnError(err?.message || 'লেসন লোড করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoadingLesson(false);
    }
  };

  if (!isOpen) return null;

  const generatedRepoNames = Object.keys(campaignsByRepo);

  return (
    <div
      id="github-business-hub-modal"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-full sm:h-[92vh] flex flex-col rounded-none sm:rounded-3xl bg-white dark:bg-stone-900 border-0 sm:border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Mobile Handle */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                  GitHub বিজনেস, SMS, মার্কেটিং ও অটো-Gmail স্টুডিও
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  AI Growth Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 truncate mt-0.5">
                গিটহাব প্রজেক্টের জন্য AI বিজনেস আইডিয়া, SMS ক্যাম্পেইন, সরাসরি Gmail প্রেরণ ও বিজনেস লার্নিং
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isGmailConnected ? (
              <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Gmail: {user?.email || 'Connected'}</span>
              </span>
            ) : (
              <div className="hidden md:block">
                <GoogleSignInButton
                  onClick={handleConnectGmail}
                  isLoading={isConnectingGmail}
                  label="Sign in with Google"
                />
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Selected Project Strip + Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/70 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('ideas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === 'ideas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-emerald-400'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>১. প্রজেক্ট ও আইডিয়া</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sms')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === 'sms'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-teal-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>২. SMS ক্যাম্পেইন</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gmail')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === 'gmail'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-rose-400'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>৩. অটো-Gmail প্রেরণ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('marketing')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === 'marketing'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-blue-400'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>৪. মার্কেটিং ও ব্যবসা বৃদ্ধি</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('learn')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === 'learn'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-purple-400'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>৫. বিজনেস ইন শিখুন</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-stone-500 dark:text-stone-400 hidden sm:inline">সক্রিয় প্রজেক্ট:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 font-bold max-w-[240px] truncate">
              <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{selectedRepo.name}</span>
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ==================== TAB 1: GITHUB REPOS & IDEA GENERATION ==================== */}
          {activeTab === 'ideas' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: GitHub Repository Selector */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-purple-500" />
                    <span>আপনার GitHub প্রজেক্টসমূহ ({repos.length})</span>
                  </h3>
                  {isLoadingRepos && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    placeholder="প্রজেক্ট খুঁজুন (PayHub, Stripe, Studio...)"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo.name === repo.name;
                    const hasGenerated = Boolean(campaignsByRepo[repo.name]);
                    return (
                      <button
                        key={repo.id}
                        type="button"
                        onClick={() => setSelectedRepo(repo)}
                        className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                            : 'bg-stone-50/70 dark:bg-stone-950/60 border-stone-200 dark:border-stone-800 hover:border-purple-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold truncate text-stone-900 dark:text-stone-100">
                            {repo.name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {hasGenerated && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                AI প্রস্তুত ✓
                              </span>
                            )}
                            {repo.language && (
                              <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10px] font-mono">
                                {repo.language}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-1">
                          {repo.description || 'GitHub Repository — ক্লিক করে বিজনেস প্ল্যান তৈরি করুন।'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: AI Generator Controls + Business Ideas Output */}
              <div className="lg:col-span-7 space-y-4">
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 dark:from-emerald-950/30 dark:via-stone-900 dark:to-teal-950/20 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                        {selectedRepo.name}
                      </h3>
                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                        {selectedRepo.description || 'এই প্রজেক্টের জন্য AI দিয়ে ব্যবসার আইডিয়া, SMS, মার্কেটিং ও অটো-Gmail তৈরি করুন।'}
                      </p>
                    </div>
                    <a
                      href={selectedRepo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline shrink-0"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        টার্গেট মার্কেট (Target Market):
                      </label>
                      <input
                        type="text"
                        value={targetMarket}
                        onChange={(e) => setTargetMarket(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 dark:text-stone-400 mb-1">
                        লক্ষ্য (Business Focus):
                      </label>
                      <input
                        type="text"
                        value={focusGoal}
                        onChange={(e) => setFocusGoal(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="generate-repo-business-plan-btn"
                      onClick={() => handleGenerateCampaign(selectedRepo)}
                      disabled={isGeneratingCampaign}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-60"
                    >
                      {isGeneratingCampaign ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>AI আইডিয়া, SMS ও Gmail তৈরি হচ্ছে...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {currentCampaign
                              ? 'নতুন করে AI আইডিয়া, SMS ও Gmail তৈরি করুন'
                              : 'AI আইডিয়া, SMS, মার্কেটিং ও Gmail তৈরি করুন'}
                          </span>
                        </>
                      )}
                    </button>

                    {currentCampaign && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('gmail')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>অটো-Gmail পাঠান</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {generationError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{generationError}</span>
                    </div>
                  )}
                </div>

                {/* Business Ideas Output */}
                {currentCampaign ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-xs leading-relaxed">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">বাণিজ্যিক সারাংশ: </span>
                      {currentCampaign.summaryBn}
                    </div>

                    <div className="space-y-2.5">
                      {currentCampaign.businessIdeas.map((idea, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-2 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                              💡 আইডিয়া {idx + 1}: {idea.title}
                            </h4>
                            <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold shrink-0">
                              {idea.businessModel}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-600 dark:text-stone-400">
                            <div>
                              <strong className="text-stone-800 dark:text-stone-200">টার্গেট ক্রেতা:</strong> {idea.targetAudience}
                            </div>
                            <div>
                              <strong className="text-stone-800 dark:text-stone-200">মূল্য নির্ধারণ:</strong> {idea.pricingStrategy}
                            </div>
                            <div>
                              <strong className="text-stone-800 dark:text-stone-200">আয়ের সম্ভাবনা:</strong> {idea.revenuePotential}
                            </div>
                            <div>
                              <strong className="text-stone-800 dark:text-stone-200">প্রথম পদক্ষেপ:</strong> {idea.firstSteps}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-2 text-xs text-stone-500 dark:text-stone-400">
                    <Target className="w-8 h-8 mx-auto text-emerald-500 opacity-80" />
                    <p className="font-semibold text-stone-700 dark:text-stone-300">
                      বাম পাশ থেকে যেকোনো একটি GitHub প্রজেক্ট বেছে নিয়ে উপরের সবুজ বাটনে ক্লিক করুন
                    </p>
                    <p>
                      এআই সাথে সাথে ওই প্রজেক্টের জন্য ৩টি বিজনেস মডেল, SMS কপি, কাজের Gmail ড্রাফট, মার্কেটিং প্ল্যান ও বিজনেস লেসন তৈরি করবে।
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: SMS MARKETING WRITER & DISPATCH ==================== */}
          {activeTab === 'sms' && (
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-teal-950 dark:text-teal-200">
                    প্রজেক্ট-ভিত্তিক SMS ও WhatsApp মার্কেটিং মেসেজ রাইটার
                  </h3>
                  <p className="text-xs text-teal-800/80 dark:text-teal-300/80 mt-0.5">
                    প্রজেক্ট: <strong>{selectedRepo.name}</strong> — নিচের AI টেমপ্লেট বেছে নিয়ে বা এডিট করে সরাসরি SMS / WhatsApp পাঠান।
                  </p>
                </div>
                {!currentCampaign && (
                  <button
                    type="button"
                    onClick={() => handleGenerateCampaign(selectedRepo)}
                    disabled={isGeneratingCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
                  >
                    {isGeneratingCampaign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>AI SMS তৈরি করুন</span>
                  </button>
                )}
              </div>

              {/* AI SMS Templates */}
              {currentCampaign?.smsTemplates && currentCampaign.smsTemplates.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {currentCampaign.smsTemplates.map((tmpl, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-teal-700 dark:text-teal-300">{tmpl.label}</span>
                          <span className="px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-[10px]">
                            {tmpl.language}
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
                          {tmpl.message}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmsBody(tmpl.message)}
                        className="w-full py-1.5 rounded-lg bg-teal-600/10 hover:bg-teal-600 text-teal-700 hover:text-white dark:text-teal-300 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        এডিটরে লোড করুন
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SMS Composer & Send Actions */}
              <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                    প্রাপকের মোবাইল / WhatsApp নম্বর:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="+88017xxxxxxxx বা 017xxxxxxxx"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                      মার্কেটিং SMS বার্তা:
                    </label>
                    <span className="text-[11px] text-stone-500">{smsBody.length} অক্ষর</span>
                  </div>
                  <textarea
                    rows={4}
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    placeholder="উপর থেকে AI SMS টেমপ্লেট লোড করুন অথবা আপনার কাস্টম বিক্রয় বার্তা লিখুন..."
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={`sms:${smsPhone.trim()}?body=${encodeURIComponent(smsBody.trim())}`}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>ফোনে SMS পাঠান</span>
                  </a>

                  <a
                    href={
                      smsPhone.replace(/[^0-9]/g, '')
                        ? `https://api.whatsapp.com/send?phone=${smsPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(smsBody.trim())}`
                        : `https://api.whatsapp.com/send?text=${encodeURIComponent(smsBody.trim())}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp-এ পাঠান</span>
                  </a>

                  {onOpenPulseSms && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(smsBody, 'pulse-sms');
                        onOpenPulseSms();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>কপি করে Pulse SMS খুলুন</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(smsBody, 'sms-copy')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                  >
                    {copiedId === 'sms-copy' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'sms-copy' ? 'কপি হয়েছে' : 'SMS কপি করুন'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: AUTOMATED WORKING GMAIL DISPATCH ==================== */}
          {activeTab === 'gmail' && (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Connection Status Card */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isGmailConnected
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isGmailConnected ? <ShieldCheck className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                      {isGmailConnected
                        ? `অটোমেটেড Gmail প্রস্তুত — প্রেরক: ${user?.email || 'Google Account'}`
                        : 'সরাসরি Gmail পাঠাতে Google অ্যাকাউন্ট সংযুক্ত করুন'}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      এক বা একাধিক প্রাপক ইমেইল দিন — নিশ্চিত করার পর আপনার Gmail থেকে স্বয়ংক্রিয়ভাবে প্রফেশনাল ইমেইল চলে যাবে।
                    </p>
                  </div>
                </div>

                {isGmailConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectGmail}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-bold cursor-pointer"
                  >
                    সংযুক্ত ✓
                  </button>
                ) : (
                  <GoogleSignInButton
                    onClick={handleConnectGmail}
                    isLoading={isConnectingGmail}
                    label="Sign in with Google"
                  />
                )}
              </div>

              {gmailStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    gmailStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {gmailStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{gmailStatus.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left: Composer & Batch Sending */}
                <div className="lg:col-span-8 space-y-4 p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-700 dark:text-stone-300">ভাষা:</span>
                      <button
                        type="button"
                        onClick={() => setEmailLang('bn')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          emailLang === 'bn'
                            ? 'bg-rose-600 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        বাংলা ইমেইল
                      </button>
                      <button
                        type="button"
                        onClick={() => setEmailLang('en')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                          emailLang === 'en'
                            ? 'bg-rose-600 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300'
                        }`}
                      >
                        English B2B
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {onOpenTemplatesLibrary && (
                        <button
                          type="button"
                          onClick={() => onOpenTemplatesLibrary()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-bold cursor-pointer"
                        >
                          <BookMarked className="w-3.5 h-3.5" />
                          <span>টেমপ্লেট লাইব্রেরি</span>
                        </button>
                      )}

                      {!currentCampaign && (
                        <button
                          type="button"
                          onClick={() => handleGenerateCampaign(selectedRepo)}
                          disabled={isGeneratingCampaign}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                        >
                          {isGeneratingCampaign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>AI কাজের ইমেইল তৈরি</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {currentCampaign?.emailCampaign?.idealRecipientPersona && (
                    <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/50 text-[11px] text-blue-900 dark:text-blue-200">
                      <strong>কার কাছে পাঠাবেন (Ideal Recipient):</strong> {currentCampaign.emailCampaign.idealRecipientPersona}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                        প্রাপক ইমেইল তালিকা (কমা বা নতুন লাইন দিয়ে একাধিক):
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setGmailRecipientsInput((prev) =>
                            prev ? `${prev}, sheikhfaridvisa164@gmail.com` : 'sheikhfaridvisa164@gmail.com'
                          )
                        }
                        className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        + টেস্ট প্রাপক যোগ
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={gmailRecipientsInput}
                      onChange={(e) => setGmailRecipientsInput(e.target.value)}
                      placeholder="client@company.com, partner@startup.io, hr@agency.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      বিষয় (Subject):
                    </label>
                    <input
                      type="text"
                      value={gmailSubject}
                      onChange={(e) => setGmailSubject(e.target.value)}
                      placeholder="ইমেইলের বিষয়..."
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                      কাজের Gmail বিবরণ (Body):
                    </label>
                    <textarea
                      rows={8}
                      value={gmailBody}
                      onChange={(e) => setGmailBody(e.target.value)}
                      placeholder="উপর থেকে AI ইমেইল তৈরি করুন বা নিজের মতো লিখুন..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      id="hub-send-direct-gmail-btn"
                      onClick={() => handlePrepareGmailDispatch('send', false)}
                      disabled={isSendingGmail || isConnectingGmail}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-emerald-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSendingGmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>সরাসরি Gmail পাঠান</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrepareGmailDispatch('draft', false)}
                      disabled={isSendingGmail || isConnectingGmail}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Gmail ড্রাফট সেভ</span>
                    </button>

                    {onOpenTemplatesLibrary && (gmailSubject.trim() || gmailBody.trim()) && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenTemplatesLibrary({
                            title: `${selectedRepo.name} — আউটরিচ টেমপ্লেট`,
                            category: 'Marketing',
                            language: emailLang,
                            subject: gmailSubject,
                            body: gmailBody,
                            recipientHint: gmailRecipientsInput || undefined,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-xs font-semibold cursor-pointer"
                      >
                        <BookMarked className="w-3.5 h-3.5" />
                        <span>টেমপ্লেট সেভ করুন</span>
                      </button>
                    )}

                    {onOpenEmailComposer && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenEmailComposer({
                            recipient: gmailRecipientsInput,
                            subject: gmailSubject,
                            body: gmailBody,
                            language: emailLang,
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>পূর্ণাঙ্গ ইমেইল স্টুডিও</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Right: Multi-Project Batch Auto-Gmail + Dispatch Log */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
                    <h4 className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span>মাল্টি-প্রজেক্ট অটো-Gmail ব্যাচ</span>
                    </h4>
                    <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">
                      যে প্রজেক্টগুলোর জন্য AI ক্যাম্পেইন তৈরি আছে, সেগুলো নির্বাচন করে একসাথে সবার কাছে পিচ ইমেইল পাঠান:
                    </p>

                    {generatedRepoNames.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {generatedRepoNames.map((rName) => {
                          const checked = selectedBatchRepos.includes(rName);
                          return (
                            <label
                              key={rName}
                              className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBatchRepos((prev) => [...prev, rName]);
                                  } else {
                                    setSelectedBatchRepos((prev) => prev.filter((x) => x !== rName));
                                  }
                                }}
                                className="rounded text-purple-600"
                              />
                              <span className="truncate font-medium">{rName}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] italic text-stone-500">
                        এখনও কোনো প্রজেক্টের ক্যাম্পেইন তৈরি হয়নি। ট্যাব ১ থেকে তৈরি করুন।
                      </p>
                    )}

                    {selectedBatchRepos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handlePrepareGmailDispatch('send', true)}
                        disabled={isSendingGmail || isConnectingGmail}
                        className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        {selectedBatchRepos.length}টি প্রজেক্ট ব্যাচ Gmail পাঠান
                      </button>
                    )}
                  </div>

                  {/* Dispatch History */}
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-2.5">
                    <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      প্রেরণ লগ (Gmail History)
                    </h4>
                    {dispatchLogs.length > 0 ? (
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {dispatchLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {log.mode === 'draft' ? '📝 ড্রাফট' : '✅ পাঠানো হয়েছে'}
                              </span>
                              <span className="text-[10px] text-stone-400 font-mono">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="font-semibold truncate">{log.to}</div>
                            <div className="text-stone-500 truncate">{log.subject}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-stone-500">এখনও কোনো Gmail পাঠানো হয়নি।</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: MARKETING PLAYBOOK & BUSINESS GROWTH ==================== */}
          {activeTab === 'marketing' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200">
                    ব্যবসা বৃদ্ধি ও ডিজিটাল মার্কেটিং প্লেবুক
                  </h3>
                  <p className="text-xs text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                    প্রজেক্ট: <strong>{selectedRepo.name}</strong> — মার্কেটিং চ্যানেল, সাপ্তাহিক পরিকল্পনা ও গ্রোথ হ্যাকস
                  </p>
                </div>
                {!currentCampaign && (
                  <button
                    type="button"
                    onClick={() => handleGenerateCampaign(selectedRepo)}
                    disabled={isGeneratingCampaign}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                  >
                    {isGeneratingCampaign ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>মার্কেটিং প্ল্যান তৈরি</span>
                  </button>
                )}
              </div>

              {currentCampaign?.marketingPlaybook ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-3">
                    <h4 className="text-sm font-extrabold text-stone-900 dark:text-stone-100">
                      🎯 {currentCampaign.marketingPlaybook.headline}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {currentCampaign.marketingPlaybook.channels.map((ch, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-200 text-xs font-semibold"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        সাপ্তাহিক অ্যাকশন প্ল্যান (Weekly Plan)
                      </h5>
                      <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
                        {currentCampaign.marketingPlaybook.weeklyActionPlan.map((step, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              {i + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-2.5">
                      <h5 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        গ্রোথ ট্যাকটিক্স ও সেলস টিপস
                      </h5>
                      <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300">
                        {currentCampaign.marketingPlaybook.growthTactics.map((tactic, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <TrendingUp className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                            <span>{tactic}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {onSendToChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSendToChat(
                          `আমার GitHub প্রজেক্ট "${selectedRepo.name}" (${selectedRepo.html_url}) ব্যবহার করে ব্যবসা বাড়াতে Facebook, LinkedIn, SMS এবং Gmail মার্কেটিংয়ের একটি বিস্তারিত ৩০ দিনের ক্যালেন্ডার ও কনটেন্ট আইডিয়া তৈরি করে দাও।`
                        );
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>৩০ দিনের পূর্ণাঙ্গ মার্কেটিং রোডম্যাপের জন্য চ্যাটে যান</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                  মার্কেটিং প্লেবুক দেখতে "মার্কেটিং প্ল্যান তৈরি" বাটনে ক্লিক করুন।
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: BUSINESS INSIGHTS & LEARNING ACADEMY ==================== */}
          {activeTab === 'learn' && (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Project Specific Lesson if available */}
              {currentCampaign?.businessLesson && (
                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>প্রজেক্ট-ভিত্তিক বিজনেস শিক্ষা ({selectedRepo.name}): {currentCampaign.businessLesson.topicTitle}</span>
                  </div>
                  <ul className="space-y-1 text-xs text-stone-700 dark:text-stone-300 list-disc list-inside">
                    {currentCampaign.businessLesson.keyTakeaways.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200 pt-1">
                    💡 পরামর্শ: {currentCampaign.businessLesson.practicalAdvice}
                  </p>
                </div>
              )}

              {/* Curriculum Modules */}
              <div className="space-y-2">
                <h3 className="text-xs sm:text-sm font-bold text-stone-800 dark:text-stone-200">
                  ব্যবসা ও মার্কেটিং শেখার মডিউলসমূহ (ক্লিক করে বিস্তারিত শিখুন):
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {CURRICULUM_TOPICS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isLoadingLesson}
                      onClick={() => {
                        setLearnQuestion(item.title);
                        handleLearnTopic(item.title);
                      }}
                      className="text-left p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 hover:border-purple-500 transition-all cursor-pointer space-y-1"
                    >
                      <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{item.title}</div>
                      <div className="text-[11px] text-stone-500 dark:text-stone-400 leading-snug">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Business Mentor Ask Box */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20 space-y-2.5">
                <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                  এআই বিজনেস মেন্টরকে প্রশ্ন করুন (ব্যবসা, সেলস, মার্কেটিং বা প্রাইসিং):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={learnQuestion}
                    onChange={(e) => setLearnQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLearnTopic();
                    }}
                    placeholder="যেমন: আমার পেমেন্ট গেটওয়ে অ্যাপ কীভাবে প্রথম ৫০টি ব্যবসায় বিক্রি করব?"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleLearnTopic()}
                    disabled={isLoadingLesson || !learnQuestion.trim()}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isLoadingLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    <span>শিখুন ও গাইড পান</span>
                  </button>
                </div>
                {learnError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400">{learnError}</p>
                )}
              </div>

              {/* Structured Lesson Output */}
              {learnLesson && (
                <div className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/70 space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="text-base font-extrabold text-purple-700 dark:text-purple-300">
                      🎓 {learnLesson.title}
                    </h4>
                    <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 leading-relaxed">
                      {learnLesson.overview}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {learnLesson.coreConcepts.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1.5"
                      >
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100">{c.heading}</div>
                        <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed">{c.explanation}</p>
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded-lg">
                          <strong>উদাহরণ:</strong> {c.example}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 space-y-1.5">
                      <div className="text-xs font-bold text-blue-900 dark:text-blue-200">আজকের করণীয় চেকলিস্ট:</div>
                      <ul className="space-y-1 text-xs text-stone-700 dark:text-stone-300">
                        {learnLesson.actionChecklist.map((step, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 space-y-1.5">
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-200">বিশেষজ্ঞ টিপস (Pro Tip):</div>
                      <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">{learnLesson.proTip}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Confirmation Dialog for any Direct Gmail Send or Batch Dispatch */}
      <GmailConfirmModal
        isOpen={confirmState !== null}
        mode={confirmState?.mode || 'send'}
        senderEmail={user?.email}
        items={confirmState?.items || []}
        isExecuting={isSendingGmail}
        onConfirm={handleConfirmDispatch}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
};
