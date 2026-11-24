import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookMarked,
  Plus,
  Search,
  Star,
  Copy,
  Check,
  Edit3,
  Trash2,
  Send,
  CopyPlus,
  RotateCcw,
  Tag,
  Languages,
  Sparkles,
  CheckCircle2,
  FolderOpen,
  ArrowLeft,
  Save,
  Download,
  Upload,
  FolderPlus,
} from 'lucide-react';
import {
  SavedEmailTemplate,
  OutreachTemplateCategory,
  BUILTIN_CATEGORIES,
  getCategoryMeta,
  loadEmailTemplates,
  loadCustomCategories,
  saveCustomCategory,
  upsertEmailTemplate,
  deleteEmailTemplateById,
  toggleFavoriteEmailTemplateById,
  incrementEmailTemplateUsage,
  recategorizeEmailTemplateById,
  importEmailTemplatesJson,
  restoreDefaultEmailTemplates,
} from '../lib/emailTemplatesStorage';

export interface TemplateInitialDraft {
  title?: string;
  category?: OutreachTemplateCategory;
  language?: 'bn' | 'en';
  subject?: string;
  body?: string;
  recipientHint?: string;
}

interface EmailTemplatesLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCreateDraft?: TemplateInitialDraft | null;
  onUseTemplate: (template: SavedEmailTemplate) => void;
}

type CategoryFilter = 'All' | OutreachTemplateCategory;
type SortMode = 'updated' | 'usage' | 'favorites' | 'title';

const QUICK_PLACEHOLDERS_BN = [
  '[প্রাপকের নাম]',
  '[প্রতিষ্ঠানের নাম]',
  '[প্রজেক্টের নাম]',
  '[আপনার নাম]',
  '[ফোন নম্বর]',
];

const QUICK_PLACEHOLDERS_EN = [
  '[Recipient Name]',
  '[Company Name]',
  '[Project Name]',
  '[Your Name]',
  '[Date / Time]',
];

export const EmailTemplatesLibraryModal: React.FC<EmailTemplatesLibraryModalProps> = ({
  isOpen,
  onClose,
  initialCreateDraft,
  onUseTemplate,
}) => {
  const [templates, setTemplates] = useState<SavedEmailTemplate[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [langFilter, setLangFilter] = useState<'all' | 'bn' | 'en'>('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('updated');
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Form Mode
  const [isFormMode, setIsFormMode] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<OutreachTemplateCategory>('Marketing');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [formLanguage, setFormLanguage] = useState<'bn' | 'en'>('bn');
  const [formRecipientHint, setFormRecipientHint] = useState('');
  const [formTagsInput, setFormTagsInput] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Placeholder customization state in preview
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});

  // UI feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((prev) => (prev === msg ? null : prev)), 2800);
  };

  // Load templates when modal opens; if initialCreateDraft provided, jump straight to Create form
  useEffect(() => {
    if (!isOpen) return;
    const loaded = loadEmailTemplates();
    setTemplates(loaded);
    setCustomCategories(loadCustomCategories());
    setDeleteConfirmId(null);
    setFormError(null);
    setNewCategoryInput('');

    if (initialCreateDraft && (initialCreateDraft.subject || initialCreateDraft.body || initialCreateDraft.title)) {
      setIsFormMode(true);
      setEditingId(undefined);
      setFormTitle(initialCreateDraft.title || '');
      setFormCategory(initialCreateDraft.category || 'Marketing');
      setFormLanguage(initialCreateDraft.language || 'bn');
      setFormRecipientHint(initialCreateDraft.recipientHint || '');
      setFormTagsInput('');
      setFormSubject(initialCreateDraft.subject || '');
      setFormBody(initialCreateDraft.body || '');
    } else {
      setIsFormMode(false);
      if (loaded.length > 0) {
        setSelectedId((prev) => (loaded.some((t) => t.id === prev) ? prev : loaded[0].id));
      }
    }
  }, [isOpen, initialCreateDraft]);

  // All available categories = Built-in + Custom saved + any categories present on existing templates
  const allCategories = useMemo(() => {
    const ordered: string[] = [...BUILTIN_CATEGORIES];
    const seen = new Set(ordered.map((c) => c.toLowerCase()));
    [...customCategories, ...templates.map((t) => t.category)].forEach((cat) => {
      const trimmed = String(cat || '').trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        ordered.push(trimmed);
      }
    });
    return ordered;
  }, [customCategories, templates]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = templates.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (langFilter !== 'all' && t.language !== langFilter) return false;
      if (onlyFavorites && !t.isFavorite) return false;
      if (onlyCustom && !t.isCustom) return false;
      if (!q) return true;
      const inTitle = t.title.toLowerCase().includes(q);
      const inSubject = t.subject.toLowerCase().includes(q);
      const inBody = t.body.toLowerCase().includes(q);
      const inCat = t.category.toLowerCase().includes(q);
      const inTags = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
      return inTitle || inSubject || inBody || inCat || inTags;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'usage') return (b.usageCount || 0) - (a.usageCount || 0);
      if (sortBy === 'favorites') {
        if (Boolean(b.isFavorite) !== Boolean(a.isFavorite)) return b.isFavorite ? 1 : -1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      }
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [templates, categoryFilter, langFilter, onlyFavorites, onlyCustom, sortBy, searchQuery]);

  const selectedTemplate = useMemo(
    () =>
      filteredTemplates.find((t) => t.id === selectedId) ||
      templates.find((t) => t.id === selectedId) ||
      filteredTemplates[0] ||
      null,
    [filteredTemplates, templates, selectedId]
  );

  // Reset placeholder inputs when selected template changes
  useEffect(() => {
    setPlaceholderValues({});
    setDeleteConfirmId(null);
  }, [selectedTemplate?.id]);

  // Extract bracketed placeholders like [Company Name] or {{client}}
  const detectedPlaceholders = useMemo(() => {
    if (!selectedTemplate) return [];
    const combined = `${selectedTemplate.subject}\n${selectedTemplate.body}`;
    const matches = combined.match(/\[[^\]\n]{2,40}\]|\{\{[^}\n]{2,40}\}\}/g) || [];
    return Array.from(new Set(matches)).slice(0, 8);
  }, [selectedTemplate]);

  // Apply placeholder substitutions live for preview, copy, or sending to composer
  const resolvedSubject = useMemo(() => {
    if (!selectedTemplate) return '';
    let result = selectedTemplate.subject;
    for (const [token, val] of Object.entries(placeholderValues)) {
      if (val.trim()) {
        result = result.split(token).join(val.trim());
      }
    }
    return result;
  }, [selectedTemplate, placeholderValues]);

  const resolvedBody = useMemo(() => {
    if (!selectedTemplate) return '';
    let result = selectedTemplate.body;
    for (const [token, val] of Object.entries(placeholderValues)) {
      if (val.trim()) {
        result = result.split(token).join(val.trim());
      }
    }
    return result;
  }, [selectedTemplate, placeholderValues]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: templates.length,
    };
    allCategories.forEach((cat) => {
      counts[cat] = 0;
    });
    templates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates, allCategories]);

  const startCreateNew = () => {
    setIsFormMode(true);
    setEditingId(undefined);
    setFormTitle('');
    setFormCategory(categoryFilter !== 'All' ? categoryFilter : 'Marketing');
    setFormLanguage(langFilter === 'en' ? 'en' : 'bn');
    setFormRecipientHint('');
    setFormTagsInput('');
    setFormSubject('');
    setFormBody('');
    setFormError(null);
  };

  const startEditTemplate = (tmpl: SavedEmailTemplate) => {
    setIsFormMode(true);
    setEditingId(tmpl.id);
    setFormTitle(tmpl.title);
    setFormCategory(tmpl.category);
    setFormLanguage(tmpl.language);
    setFormRecipientHint(tmpl.recipientHint || '');
    setFormTagsInput((tmpl.tags || []).join(', '));
    setFormSubject(tmpl.subject);
    setFormBody(tmpl.body);
    setFormError(null);
  };

  const handleDuplicateTemplate = (tmpl: SavedEmailTemplate) => {
    const { templates: next, savedItem } = upsertEmailTemplate({
      title: `${tmpl.title} (কপি)`,
      category: tmpl.category,
      language: tmpl.language,
      subject: tmpl.subject,
      body: tmpl.body,
      recipientHint: tmpl.recipientHint,
      tags: tmpl.tags,
      isFavorite: false,
      isCustom: true,
    });
    setTemplates(next);
    setSelectedId(savedItem.id);
    showToast('টেমপ্লেটটি ডুপ্লিকেট করে সংরক্ষণ করা হয়েছে।');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('অনুগ্রহ করে টেমপ্লেটের একটি নাম (Title) লিখুন।');
      return;
    }
    if (!formSubject.trim() && !formBody.trim()) {
      setFormError('অনুগ্রহ করে ইমেইলের বিষয় অথবা মূল বার্তা লিখুন।');
      return;
    }

    const tags = formTagsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const { templates: next, savedItem } = upsertEmailTemplate({
      id: editingId,
      title: formTitle.trim(),
      category: formCategory,
      language: formLanguage,
      subject: formSubject.trim(),
      body: formBody.trim(),
      recipientHint: formRecipientHint.trim() || undefined,
      tags,
      isCustom: true,
    });

    setTemplates(next);
    setSelectedId(savedItem.id);
    setIsFormMode(false);
    setCategoryFilter('All');
    showToast(editingId ? 'টেমপ্লেটটি সফলভাবে আপডেট হয়েছে!' : 'নতুন টেমপ্লেট লাইব্রেরিতে সেভ হয়েছে!');
  };

  const handleDeleteTemplate = (id: string) => {
    const next = deleteEmailTemplateById(id);
    setTemplates(next);
    setDeleteConfirmId(null);
    if (selectedId === id) {
      setSelectedId(next[0]?.id || '');
    }
    showToast('টেমপ্লেটটি মুছে ফেলা হয়েছে।');
  };

  const handleToggleFavorite = (id: string) => {
    const next = toggleFavoriteEmailTemplateById(id);
    setTemplates(next);
  };

  const handleAddCustomCategory = () => {
    const clean = newCategoryInput.trim();
    if (!clean) return;
    const nextCats = saveCustomCategory(clean);
    setCustomCategories(nextCats);
    setFormCategory(clean);
    setNewCategoryInput('');
    showToast(`ক্যাটাগরি "${clean}" যুক্ত হয়েছে।`);
  };

  const handleRecategorizeSelected = (id: string, nextCategory: string) => {
    const next = recategorizeEmailTemplateById(id, nextCategory);
    setTemplates(next);
    showToast(`ক্যাটাগরি "${getCategoryMeta(nextCategory).labelBn}"-এ পরিবর্তন করা হয়েছে।`);
  };

  const handleExportLibraryJson = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-templates-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('টেমপ্লেট লাইব্রেরি JSON হিসেবে এক্সপোর্ট হয়েছে।');
  };

  const handleImportLibraryJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '[]'));
        const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.templates) ? parsed.templates : [];
        if (list.length === 0) {
          showToast('ফাইলে কোনো বৈধ টেমপ্লেট পাওয়া যায়নি।');
          return;
        }
        const { templates: next, addedCount } = importEmailTemplatesJson(list);
        setTemplates(next);
        setCustomCategories(loadCustomCategories());
        showToast(`${addedCount}টি টেমপ্লেট সফলভাবে ইম্পোর্ট করা হয়েছে!`);
      } catch {
        showToast('JSON ফাইল পড়া যায়নি। সঠিক টেমপ্লেট ফাইল নির্বাচন করুন।');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRestoreDefaults = () => {
    const next = restoreDefaultEmailTemplates();
    setTemplates(next);
    if (!selectedId && next[0]) setSelectedId(next[0].id);
    showToast('ডিফল্ট বিজনেস টেমপ্লেটগুলো পুনরুদ্ধার করা হয়েছে।');
  };

  const handleCopyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleApplySelectedTemplate = () => {
    if (!selectedTemplate) return;
    const next = incrementEmailTemplateUsage(selectedTemplate.id);
    setTemplates(next);
    onUseTemplate({
      ...selectedTemplate,
      subject: resolvedSubject,
      body: resolvedBody,
    });
    onClose();
  };

  const handleInsertPlaceholderChip = (token: string) => {
    setFormBody((prev) => (prev ? `${prev} ${token}` : token));
  };

  if (!isOpen) return null;

  return (
    <div
      id="email-templates-library-backdrop"
      className="fixed inset-0 z-[60] flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="email-templates-library-modal"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl h-full sm:h-[90vh] flex flex-col rounded-none sm:rounded-3xl bg-white dark:bg-stone-900 border-0 sm:border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100"
      >
        {/* Mobile Handle */}
        <div className="w-12 h-1.5 bg-stone-300 dark:bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-stone-200 dark:border-stone-800 bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-indigo-500/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <BookMarked className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-extrabold tracking-tight truncate">
                  ইমেইল টেমপ্লেট লাইব্রেরি (Email Templates Library)
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {templates.length}টি টেমপ্লেট
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 truncate mt-0.5">
                মার্কেটিং, কোলাবোরেশন ও ফলো-আপ আউটরিচ ইমেইল সেভ করে বারবার ব্যবহার করুন
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isFormMode && (
              <button
                type="button"
                id="create-email-template-btn"
                onClick={startCreateNew}
                className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">নতুন টেমপ্লেট তৈরি</span>
                <span className="sm:hidden">নতুন</span>
              </button>
            )}
            <button
              type="button"
              id="close-email-templates-library-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusToast && (
          <div className="mx-4 sm:mx-6 mt-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{statusToast}</span>
          </div>
        )}

        {/* Filter & Search Bar (Hidden in Create/Edit Form Mode) */}
        {!isFormMode && (
          <div className="px-4 sm:px-6 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 space-y-2.5 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  id="tpl-filter-all"
                  onClick={() => setCategoryFilter('All')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    categoryFilter === 'All'
                      ? 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-400'
                  }`}
                >
                  সকল ({categoryCounts.All})
                </button>

                {allCategories.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  const active = categoryFilter === cat;
                  const count = categoryCounts[cat] || 0;
                  return (
                    <button
                      key={cat}
                      type="button"
                      id={`tpl-filter-${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        active
                          ? meta.activeTabClass
                          : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-800 hover:border-stone-400'
                      }`}
                    >
                      {meta.labelBn === meta.labelEn ? meta.labelEn : `${meta.labelBn} (${meta.labelEn})`} • {count}
                    </button>
                  );
                })}
              </div>

              {/* Search + Language + Sort + Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px] sm:w-48">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="tpl-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="টেমপ্লেট খুঁজুন..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value as 'all' | 'bn' | 'en')}
                  aria-label="ভাষা ফিল্টার"
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-semibold cursor-pointer"
                >
                  <option value="all">সব ভাষা</option>
                  <option value="bn">🇧🇩 বাংলা</option>
                  <option value="en">🇬🇧 English</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMode)}
                  aria-label="সাজানোর ক্রম"
                  className="px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs font-semibold cursor-pointer"
                >
                  <option value="updated">সর্বশেষ আপডেট</option>
                  <option value="usage">সর্বাধিক ব্যবহৃত</option>
                  <option value="favorites">প্রিয় আগে</option>
                  <option value="title">নাম (A–Z)</option>
                </select>

                <button
                  type="button"
                  onClick={() => setOnlyFavorites((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    onlyFavorites
                      ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-400'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                  }`}
                  title="শুধু প্রিয় টেমপ্লেট দেখুন"
                >
                  <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
                  <span>প্রিয়</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOnlyCustom((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                    onlyCustom
                      ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-400'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-800'
                  }`}
                  title="শুধু আপনার তৈরি কাস্টম টেমপ্লেট দেখুন"
                >
                  <span>কাস্টম</span>
                </button>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportLibraryJson}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-400 cursor-pointer"
                  title="JSON থেকে টেমপ্লেট ইম্পোর্ট করুন"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleExportLibraryJson}
                  className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:border-emerald-400 cursor-pointer"
                  title="সব টেমপ্লেট JSON ব্যাকআপ হিসেবে ডাউনলোড করুন"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isFormMode ? (
            /* ==================== CREATE / EDIT TEMPLATE FORM ==================== */
            <form onSubmit={handleSaveForm} className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormMode(false)}
                    className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 cursor-pointer"
                    title="ফিরে যান"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold">
                      {editingId ? 'টেমপ্লেট সম্পাদনা করুন' : 'নতুন বিজনেস ইমেইল টেমপ্লেট তৈরি করুন'}
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      মার্কেটিং, কোলাবোরেশন বা ফলো-আপ ক্যাটাগরিতে সেভ করে যেকোনো সময় ব্যবহার করুন
                    </p>
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    টেমপ্লেটের নাম (Title) *
                  </label>
                  <input
                    id="tpl-form-title"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="যেমন: SaaS সেলস পিচ বা কোলাবোরেশন প্রোপোজাল"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    ভাষা (Language)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormLanguage('bn')}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        formLanguage === 'bn'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-stone-950 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      🇧🇩 বাংলা
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormLanguage('en')}
                      className={`py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                        formLanguage === 'en'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-stone-950 border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      🇬🇧 English
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Purpose Selection + Custom Category Creator */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  উদ্দেশ্য / ক্যাটাগরি (Purpose Category) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {allCategories.map((cat) => {
                    const meta = getCategoryMeta(cat);
                    const selected = formCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormCategory(cat)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                            : 'border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 hover:border-stone-400'
                        }`}
                      >
                        <div className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {meta.labelBn === meta.labelEn ? meta.labelEn : `${meta.labelBn} (${meta.labelEn})`}
                        </div>
                        <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5 leading-snug line-clamp-2">
                          {meta.descBn}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="tpl-custom-category-input"
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomCategory();
                      }
                    }}
                    placeholder="নতুন কাস্টম ক্যাটাগরি লিখুন (যেমন: Investor Pitch, Cold Outreach)..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    disabled={!newCategoryInput.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold cursor-pointer shrink-0"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>ক্যাটাগরি যোগ</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    ডিফল্ট প্রাপক (ঐচ্ছিক Recipient Hint)
                  </label>
                  <input
                    type="text"
                    value={formRecipientHint}
                    onChange={(e) => setFormRecipientHint(e.target.value)}
                    placeholder="client@company.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                    ট্যাগ (কমা দিয়ে আলাদা করুন)
                  </label>
                  <input
                    type="text"
                    value={formTagsInput}
                    onChange={(e) => setFormTagsInput(e.target.value)}
                    placeholder="Sales, B2B, Pitch"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-stone-700 dark:text-stone-300">
                  ইমেইলের বিষয় (Subject Line) *
                </label>
                <input
                  id="tpl-form-subject"
                  type="text"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="যেমন: [প্রতিষ্ঠানের নাম]-এর জন্য ব্যবসায়িক সহযোগিতা প্রস্তাবনা"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs font-semibold"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    ইমেইলের মূল বার্তা (Email Body) *
                  </label>
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] text-stone-500">ভেরিয়েবল যোগ:</span>
                    {(formLanguage === 'bn' ? QUICK_PLACEHOLDERS_BN : QUICK_PLACEHOLDERS_EN).map((token) => (
                      <button
                        key={token}
                        type="button"
                        onClick={() => handleInsertPlaceholderChip(token)}
                        className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[10px] font-medium cursor-pointer"
                      >
                        + {token}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="tpl-form-body"
                  rows={10}
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="আপনার টেমপ্লেটের পূর্ণাঙ্গ বিবরণ লিখুন..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormMode(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  id="tpl-form-save-btn"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingId ? 'আপডেট সেভ করুন' : 'লাইব্রেরিতে সেভ করুন'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ==================== MASTER-DETAIL BROWSE & REUSE VIEW ==================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full">
              {/* Left List Column */}
              <div className="lg:col-span-5 flex flex-col gap-2.5">
                {filteredTemplates.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center space-y-3">
                    <FolderOpen className="w-9 h-9 mx-auto text-stone-400" />
                    <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                      এই ফিল্টারে কোনো টেমপ্লেট পাওয়া যায়নি।
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={startCreateNew}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                      >
                        + নতুন তৈরি করুন
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreDefaults}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>ডিফল্ট ফেরত আনুন</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[56vh] lg:max-h-[62vh] overflow-y-auto pr-1">
                    {filteredTemplates.map((tmpl) => {
                      const isSelected = selectedTemplate?.id === tmpl.id;
                      const catMeta = getCategoryMeta(tmpl.category);
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => setSelectedId(tmpl.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setSelectedId(tmpl.id);
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                            isSelected
                              ? 'bg-emerald-50/90 dark:bg-emerald-950/35 border-emerald-500 shadow-sm'
                              : 'bg-stone-50/70 dark:bg-stone-950/50 border-stone-200 dark:border-stone-800 hover:border-emerald-400/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${catMeta.badgeClass}`}>
                                {catMeta.labelBn === catMeta.labelEn ? catMeta.labelEn : `${catMeta.labelBn} • ${catMeta.labelEn}`}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-[10px] font-semibold">
                                {tmpl.language === 'bn' ? 'বাংলা' : 'EN'}
                              </span>
                              {tmpl.isCustom && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-bold">
                                  কাস্টম
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(tmpl.id);
                              }}
                              className="p-1 rounded-lg hover:bg-amber-500/10 text-stone-400 hover:text-amber-500 cursor-pointer shrink-0"
                              title={tmpl.isFavorite ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় তালিকায় যোগ করুন'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  tmpl.isFavorite ? 'fill-amber-400 text-amber-500' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                            {tmpl.title}
                          </h4>
                          <p className="text-[11px] font-medium text-stone-600 dark:text-stone-300 truncate">
                            বিষয়: {tmpl.subject}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-stone-500 dark:text-stone-400 pt-0.5">
                            <span className="truncate max-w-[200px]">
                              {(tmpl.tags || []).slice(0, 3).map((t) => `#${t}`).join(' ')}
                            </span>
                            <span>ব্যবহৃত: {tmpl.usageCount || 0} বার</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500">
                  <span>মোট ফলাফল: {filteredTemplates.length}</span>
                  <button
                    type="button"
                    onClick={handleRestoreDefaults}
                    className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>স্টার্টার টেমপ্লেট পুনরুদ্ধার</span>
                  </button>
                </div>
              </div>

              {/* Right Preview & Quick Variable Personalization Column */}
              <div className="lg:col-span-7">
                {selectedTemplate ? (
                  <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 space-y-4">
                    {/* Preview Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <select
                            aria-label="ক্যাটাগরি পরিবর্তন"
                            value={selectedTemplate.category}
                            onChange={(e) => handleRecategorizeSelected(selectedTemplate.id, e.target.value)}
                            className={`px-2 py-0.5 rounded-md border text-[10px] font-bold cursor-pointer ${
                              getCategoryMeta(selectedTemplate.category).badgeClass
                            }`}
                            title="সরাসরি ক্যাটাগরি পরিবর্তন করুন"
                          >
                            {allCategories.map((cat) => {
                              const meta = getCategoryMeta(cat);
                              return (
                                <option key={cat} value={cat}>
                                  {meta.labelBn === meta.labelEn ? meta.labelEn : `${meta.labelBn} (${cat})`}
                                </option>
                              );
                            })}
                          </select>
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-500">
                            <Languages className="w-3 h-3" />
                            {selectedTemplate.language === 'bn' ? 'বাংলা' : 'English'}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-stone-900 dark:text-stone-100">
                          {selectedTemplate.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditTemplate(selectedTemplate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                          title="টেমপ্লেট এডিট করুন"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                          <span>এডিট</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateTemplate(selectedTemplate)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                          title="ডুপ্লিকেট করুন"
                        >
                          <CopyPlus className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="hidden sm:inline">ডুপ্লিকেট</span>
                        </button>
                        {deleteConfirmId === selectedTemplate.id ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                          >
                            নিশ্চিত মুছুন
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(selectedTemplate.id)}
                            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-stone-500 hover:text-rose-600 cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Smart Variable Personalizer */}
                    {detectedPlaceholders.length > 0 && (
                      <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span>দ্রুত কাস্টমাইজেশন (ভেরিয়েবল পূরণ করলে প্রিভিউ ও ইমেইলে স্বয়ংক্রিয়ভাবে বসে যাবে):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {detectedPlaceholders.map((token) => (
                            <input
                              key={token}
                              type="text"
                              value={placeholderValues[token] || ''}
                              onChange={(e) =>
                                setPlaceholderValues((prev) => ({ ...prev, [token]: e.target.value }))
                              }
                              placeholder={token}
                              className="px-2.5 py-1.5 rounded-lg border border-amber-300/70 dark:border-amber-800/70 bg-white dark:bg-stone-900 text-[11px]"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Subject & Body Preview */}
                    <div className="space-y-2.5">
                      <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            বিষয় (Subject)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(resolvedSubject, 'subj')}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                          >
                            {copiedKey === 'subj' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'subj' ? 'কপি হয়েছে' : 'বিষয় কপি'}</span>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                          {resolvedSubject}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                            মূল বিবরণ (Email Body)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(resolvedBody, 'body')}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer"
                          >
                            {copiedKey === 'body' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === 'body' ? 'কপি হয়েছে' : 'বডি কপি'}</span>
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-800 dark:text-stone-200 max-h-64 overflow-y-auto">
                          {resolvedBody}
                        </pre>
                      </div>

                      {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                          <Tag className="w-3 h-3 text-stone-400" />
                          {selectedTemplate.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Primary Reuse Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(`Subject: ${resolvedSubject}\n\n${resolvedBody}`, 'full')
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold cursor-pointer"
                      >
                        {copiedKey === 'full' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'full' ? 'সম্পূর্ণ কপি হয়েছে' : 'সম্পূর্ণ ইমেইল কপি'}</span>
                      </button>

                      <button
                        type="button"
                        id="use-selected-email-template-btn"
                        onClick={handleApplySelectedTemplate}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
                      >
                        <Send className="w-4 h-4" />
                        <span>এই টেমপ্লেট ব্যবহার করে ইমেইল পাঠান</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-10 rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 text-center text-xs text-stone-500">
                    বাম পাশ থেকে যেকোনো টেমপ্লেট নির্বাচন করুন অথবা নতুন টেমপ্লেট তৈরি করুন।
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
