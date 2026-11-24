export type BuiltinOutreachCategory =
  | 'Marketing'
  | 'Collaboration'
  | 'Follow-up'
  | 'Sales Pitch'
  | 'Client Onboarding';

export type OutreachTemplateCategory = BuiltinOutreachCategory | (string & {});

export const BUILTIN_CATEGORIES: BuiltinOutreachCategory[] = [
  'Marketing',
  'Collaboration',
  'Follow-up',
  'Sales Pitch',
  'Client Onboarding',
];

export interface SavedEmailTemplate {
  id: string;
  title: string;
  category: OutreachTemplateCategory;
  language: 'bn' | 'en';
  subject: string;
  body: string;
  recipientHint?: string;
  tags?: string[];
  isFavorite?: boolean;
  isCustom?: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export const EMAIL_TEMPLATES_STORAGE_KEY = 'ai_studio_email_templates_library_v1';
export const EMAIL_CUSTOM_CATEGORIES_KEY = 'ai_studio_email_template_categories_v1';

export interface CategoryMetaInfo {
  labelBn: string;
  labelEn: string;
  descBn: string;
  badgeClass: string;
  activeTabClass: string;
}

export const CATEGORY_META: Record<string, CategoryMetaInfo> = {
  Marketing: {
    labelBn: 'মার্কেটিং',
    labelEn: 'Marketing',
    descBn: 'প্রোডাক্ট প্রমোশন, ব্র্যান্ডিং ও নতুন ক্লায়েন্ট অফার',
    badgeClass:
      'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    activeTabClass: 'bg-emerald-600 text-white shadow-sm',
  },
  Collaboration: {
    labelBn: 'কোলাবোরেশন',
    labelEn: 'Collaboration',
    descBn: 'পার্টনারশিপ, জয়েন্ট ভেঞ্চার, এজেন্সি ও টেক কোলাব',
    badgeClass:
      'bg-indigo-100 dark:bg-indigo-950/70 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800',
    activeTabClass: 'bg-indigo-600 text-white shadow-sm',
  },
  'Follow-up': {
    labelBn: 'ফলো-আপ',
    labelEn: 'Follow-up',
    descBn: 'মিটিং পরবর্তী ফলো-আপ, প্রোপোজাল রিমাইন্ডার ও আপডেট',
    badgeClass:
      'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    activeTabClass: 'bg-amber-600 text-white shadow-sm',
  },
  'Sales Pitch': {
    labelBn: 'সেলস পিচ',
    labelEn: 'Sales Pitch',
    descBn: 'কোল্ড আউটরিচ, B2B ডিল ক্লোজিং ও সার্ভিস প্রোপোজাল',
    badgeClass:
      'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800',
    activeTabClass: 'bg-teal-600 text-white shadow-sm',
  },
  'Client Onboarding': {
    labelBn: 'অনবোর্ডিং',
    labelEn: 'Client Onboarding',
    descBn: 'নতুন ক্লায়েন্ট ওয়েলকাম, প্রজেক্ট কিকঅফ ও অ্যাক্সেস গাইড',
    badgeClass:
      'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800',
    activeTabClass: 'bg-sky-600 text-white shadow-sm',
  },
};

export function getCategoryMeta(category: string): CategoryMetaInfo {
  if (CATEGORY_META[category]) {
    return CATEGORY_META[category];
  }
  return {
    labelBn: category,
    labelEn: category,
    descBn: 'কাস্টম বিজনেস আউটরিচ ক্যাটাগরি',
    badgeClass:
      'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    activeTabClass: 'bg-purple-600 text-white shadow-sm',
  };
}

export const DEFAULT_OUTREACH_TEMPLATES: SavedEmailTemplate[] = [
  {
    id: 'tpl-mkt-bn-saas',
    title: '🚀 সফটওয়্যার ও অটোমেশন সেলস পিচ',
    category: 'Marketing',
    language: 'bn',
    subject: 'আপনার [প্রতিষ্ঠানের নাম]-এর কাজ ৩ গুণ দ্রুত করতে স্মার্ট সফটওয়্যার সমাধান',
    body: `প্রিয় [প্রাপকের নাম],

আশা করি আপনার ব্যবসার কার্যক্রম দারুণ চলছে।

আমি [আপনার নাম]। আমরা আধুনিক ব্যবসা ও এজেন্সিগুলোর জন্য কাস্টম পেমেন্ট, SMS অটোমেশন এবং AI-ভিত্তিক ওয়েব প্ল্যাটফর্ম তৈরি করি। আপনার প্রতিষ্ঠান [প্রতিষ্ঠানের নাম]-এর কাজগুলো আরও দ্রুত ও স্বয়ংক্রিয় করতে আমাদের একটি রেডি-টু-ইউজ সমাধান রয়েছে।

এর মাধ্যমে আপনি যা পাবেন:
• ম্যানুয়াল কাজের সময় ৫০% পর্যন্ত সাশ্রয়
• অটোমেটেড কাস্টমার SMS ও Gmail রিসিট সিস্টেম
• রিয়েল-টাইম ড্যাশবোর্ড ও নিরাপদ ক্লাউড ব্যাকআপ

আপনার সুবিধাজনক সময়ে ১০ মিনিটের একটি ফ্রি লাইভ ডেমো দেখাতে পারলে খুব খুশি হব।

শুভকামনাসহ,
[আপনার নাম]
[আপনার পদবি / মোবাইল নম্বর]`,
    tags: ['Sales', 'SaaS', 'Demo'],
    isFavorite: true,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200000000,
    updatedAt: 1732200000000,
  },
  {
    id: 'tpl-mkt-en-product',
    title: '📣 B2B Product Launch & Value Outreach',
    category: 'Marketing',
    language: 'en',
    subject: 'Helping [Company Name] automate [Key Workflow] in days',
    body: `Hi [Recipient Name],

I hope your week is going well.

I have been following [Company Name]'s growth in [Industry] and noticed how fast your team is scaling. We built [Project Name] specifically to help teams like yours eliminate manual bottlenecks in [Pain Point].

Teams using our platform typically see:
- Faster client onboarding and automated Gmail/SMS notifications
- Lower operational overhead with ready-to-deploy cloud workflows
- Transparent analytics and full customization

Would you be open to a quick 10-minute walkthrough next week? I can share a live sandbox tailored for [Company Name].

Best regards,
[Your Name]
[Your Role / Contact Info]`,
    tags: ['B2B', 'Outreach', 'Product'],
    isFavorite: false,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200001000,
    updatedAt: 1732200001000,
  },
  {
    id: 'tpl-collab-bn-partner',
    title: '🤝 টেকনিক্যাল পার্টনারশিপ ও এজেন্সি কোলাবোরেশন',
    category: 'Collaboration',
    language: 'bn',
    subject: 'যৌথ প্রজেক্ট ও টেকনিক্যাল কোলাবোরেশন প্রস্তাবনা — [আপনার ব্র্যান্ড]',
    body: `সম্মানীয় [প্রাপকের নাম],

সালাম ও শুভেচ্ছা নেবেন।

আমরা [আপনার প্রতিষ্ঠান/টিমের নাম] নিয়মিত ফুল-স্ট্যাক ওয়েব অ্যাপ, এআই ইন্টিগ্রেশন এবং মোবাইল PWA প্রজেক্ট ডেভেলপমেন্ট নিয়ে কাজ করছি। আপনার কাজের মান ও নেটওয়ার্ক আমাদের কাছে অত্যন্ত অনুপ্রেরণাদায়ক মনে হয়েছে।

আমরা [প্রাপকের প্রতিষ্ঠানের নাম]-এর সাথে নিচের ক্ষেত্রগুলোতে যৌথভাবে (Collaboration) কাজ করতে আগ্রহী:
১. হোয়াইট-লেবেল সফটওয়্যার ও API ডেভেলপমেন্ট
২. ক্লায়েন্ট প্রজেক্টে ডেডিকেটেড টেকনিক্যাল সাপোর্ট
৩. যৌথ মার্কেটিং ও রেভিনিউ শেয়ারিং মডেল

এই বিষয়ে সংক্ষিপ্ত আলোচনার জন্য আগামী কয়েক দিনের মধ্যে আপনার সুবিধাজনক সময় জানালে কৃতজ্ঞ থাকব।

ধন্যবাদান্তে,
[আপনার নাম]
[গিটহাব / পোর্টফোলিও লিঙ্ক]`,
    tags: ['Partnership', 'Agency', 'White-label'],
    isFavorite: true,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200002000,
    updatedAt: 1732200002000,
  },
  {
    id: 'tpl-collab-en-dev',
    title: '🌐 Open-Source / Developer Co-Build Pitch',
    category: 'Collaboration',
    language: 'en',
    subject: 'Collaboration Idea: [Project Name] x [Partner Company]',
    body: `Hi [Recipient Name],

I really admire the work you and your team are doing at [Partner Company], especially around [Specific Area].

I maintain several production-ready web & payment tools on GitHub (including [Project Name]), and I see a strong opportunity for us to collaborate on [Mutual Goal or Integration].

If we combine your reach with our engineering stack, we could launch a joint solution quickly with minimal overhead.

Are you available for a brief chat this week to explore how we can work together?

Warm regards,
[Your Name]
[GitHub / Portfolio Link]`,
    tags: ['Tech', 'Joint Venture', 'GitHub'],
    isFavorite: false,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200003000,
    updatedAt: 1732200003000,
  },
  {
    id: 'tpl-follow-bn-gentle',
    title: '⏳ প্রোপোজাল ও মিটিং পরবর্তী ভদ্র ফলো-আপ',
    category: 'Follow-up',
    language: 'bn',
    subject: 'ফলো-আপ: [প্রজেক্ট / প্রস্তাবনার নাম] বিষয়ে আপনার মতামত',
    body: `প্রিয় [প্রাপকের নাম],

আশা করি ভালো ও সুস্থ আছেন।

গত [তারিখ/দিন]-এ পাঠানো আমাদের "[প্রজেক্ট / প্রস্তাবনার নাম]" সংক্রান্ত ইমেইলটির বিষয়ে ভদ্রভাবে খোঁজ নেওয়ার জন্য লিখছি। বুঝতে পারছি আপনি হয়তো ব্যস্ত সময় পার করছেন।

প্রস্তাবনাটি নিয়ে আপনার কোনো প্রশ্ন থাকলে অথবা বাজেট/সময়সীমায় কোনো পরিবর্তনের প্রয়োজন হলে দয়া করে আমাকে জানাবেন। আমি প্রয়োজন অনুযায়ী দ্রুত সংশোধিত প্ল্যান বা ডেমো পাঠিয়ে দিতে পারব।

আপনার উত্তরের অপেক্ষায় রইলাম।

শুভেচ্ছান্তে,
[আপনার নাম]
[ফোন নম্বর]`,
    tags: ['Reminder', 'Proposal', 'Client'],
    isFavorite: false,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200004000,
    updatedAt: 1732200004000,
  },
  {
    id: 'tpl-follow-en-postcall',
    title: '✅ Post-Meeting Action Recap & Follow-up',
    category: 'Follow-up',
    language: 'en',
    subject: 'Following up on our [Topic / Proposal] discussion',
    body: `Hi [Recipient Name],

Thank you again for taking the time to connect regarding [Project / Topic].

To keep things moving smoothly, here is a quick recap of the next steps we discussed:
1. [Action item 1 / Deliverable]
2. [Action item 2 / Review timeline]

Please let me know if you need any additional details, pricing adjustments, or technical documentation from my side to move forward.

Looking forward to your feedback!

Best regards,
[Your Name]
[Your Title / Contact]`,
    tags: ['Post-Call', 'Recap', 'Next Steps'],
    isFavorite: false,
    isCustom: false,
    usageCount: 0,
    createdAt: 1732200005000,
    updatedAt: 1732200005000,
  },
];

export function loadEmailTemplates(): SavedEmailTemplate[] {
  try {
    const raw = localStorage.getItem(EMAIL_TEMPLATES_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to defaults if corrupted
  }
  saveEmailTemplates(DEFAULT_OUTREACH_TEMPLATES);
  return DEFAULT_OUTREACH_TEMPLATES;
}

export function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(EMAIL_CUSTOM_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveCustomCategory(name: string): string[] {
  const clean = name.trim();
  if (!clean) return loadCustomCategories();
  const existing = loadCustomCategories();
  const isBuiltin = BUILTIN_CATEGORIES.some((c) => c.toLowerCase() === clean.toLowerCase());
  const alreadySaved = existing.some((c) => c.toLowerCase() === clean.toLowerCase());
  if (isBuiltin || alreadySaved) return existing;
  const next = [...existing, clean];
  try {
    localStorage.setItem(EMAIL_CUSTOM_CATEGORIES_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function saveEmailTemplates(templates: SavedEmailTemplate[]): void {
  try {
    localStorage.setItem(EMAIL_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.warn('Could not persist email templates:', err);
  }
}

export function upsertEmailTemplate(
  input: Omit<SavedEmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> & {
    id?: string;
    usageCount?: number;
  }
): { templates: SavedEmailTemplate[]; savedItem: SavedEmailTemplate } {
  const existing = loadEmailTemplates();
  const now = Date.now();
  const matchIdx = input.id ? existing.findIndex((t) => t.id === input.id) : -1;

  let savedItem: SavedEmailTemplate;
  let next: SavedEmailTemplate[];

  if (matchIdx >= 0) {
    savedItem = {
      ...existing[matchIdx],
      ...input,
      id: existing[matchIdx].id,
      updatedAt: now,
    };
    next = existing.map((t, idx) => (idx === matchIdx ? savedItem : t));
  } else {
    savedItem = {
      id: `tpl-custom-${now}-${Math.random().toString(36).slice(2, 6)}`,
      title: input.title.trim(),
      category: input.category,
      language: input.language,
      subject: input.subject.trim(),
      body: input.body.trim(),
      recipientHint: input.recipientHint?.trim() || undefined,
      tags: input.tags || [],
      isFavorite: Boolean(input.isFavorite),
      isCustom: true,
      usageCount: input.usageCount ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    next = [savedItem, ...existing];
  }

  saveEmailTemplates(next);
  return { templates: next, savedItem };
}

export function deleteEmailTemplateById(id: string): SavedEmailTemplate[] {
  const next = loadEmailTemplates().filter((t) => t.id !== id);
  saveEmailTemplates(next);
  return next;
}

export function toggleFavoriteEmailTemplateById(id: string): SavedEmailTemplate[] {
  const next = loadEmailTemplates().map((t) =>
    t.id === id ? { ...t, isFavorite: !t.isFavorite, updatedAt: Date.now() } : t
  );
  saveEmailTemplates(next);
  return next;
}

export function incrementEmailTemplateUsage(id: string): SavedEmailTemplate[] {
  const next = loadEmailTemplates().map((t) =>
    t.id === id ? { ...t, usageCount: (t.usageCount || 0) + 1, updatedAt: Date.now() } : t
  );
  saveEmailTemplates(next);
  return next;
}

export function recategorizeEmailTemplateById(
  id: string,
  category: OutreachTemplateCategory
): SavedEmailTemplate[] {
  const next = loadEmailTemplates().map((t) =>
    t.id === id ? { ...t, category: category.trim() || t.category, updatedAt: Date.now() } : t
  );
  saveEmailTemplates(next);
  return next;
}

export function importEmailTemplatesJson(items: Partial<SavedEmailTemplate>[]): {
  templates: SavedEmailTemplate[];
  addedCount: number;
} {
  const current = loadEmailTemplates();
  const now = Date.now();
  const toInsert: SavedEmailTemplate[] = [];

  items.forEach((raw, idx) => {
    const title = String(raw?.title || '').trim();
    const subject = String(raw?.subject || '').trim();
    const body = String(raw?.body || '').trim();
    if (!title || (!subject && !body)) return;

    const category = String(raw?.category || 'Marketing').trim() || 'Marketing';
    saveCustomCategory(category);

    toInsert.push({
      id: `tpl-import-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      title,
      category,
      language: raw?.language === 'en' ? 'en' : 'bn',
      subject,
      body,
      recipientHint: raw?.recipientHint ? String(raw.recipientHint).trim() : undefined,
      tags: Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean) : [],
      isFavorite: Boolean(raw?.isFavorite),
      isCustom: true,
      usageCount: Number(raw?.usageCount) || 0,
      createdAt: now,
      updatedAt: now,
    });
  });

  const merged = [...toInsert, ...current];
  saveEmailTemplates(merged);
  return { templates: merged, addedCount: toInsert.length };
}

export function restoreDefaultEmailTemplates(): SavedEmailTemplate[] {
  const current = loadEmailTemplates();
  const existingIds = new Set(current.map((t) => t.id));
  const missingDefaults = DEFAULT_OUTREACH_TEMPLATES.filter((d) => !existingIds.has(d.id));
  const merged = [...current, ...missingDefaults];
  saveEmailTemplates(merged);
  return merged;
}
