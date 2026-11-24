import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe,
  Search,
  Copy,
  Check,
  LayoutGrid,
  ListFilter,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowUpRight,
  X,
  ExternalLink,
  Link2,
} from 'lucide-react';
import { GroundingChunk } from '../types';

interface SearchGroundingSourcesProps {
  groundingChunks?: GroundingChunk[];
  searchQueries?: string[];
  className?: string;
  onOpenBrowser?: (url: string, type: 'web' | 'search', context?: any) => void;
}

interface CleanSource {
  id: string;
  url: string;
  title: string;
  domain: string;
  faviconUrl: string;
}

// Convert English digits to Bengali digits
function toBengaliNumerals(n: number): string {
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(n)
    .split('')
    .map((d) => bnDigits[parseInt(d, 10)] ?? d)
    .join('');
}

export const SearchGroundingSources: React.FC<SearchGroundingSourcesProps> = ({
  groundingChunks = [],
  searchQueries = [],
  className = '',
  onOpenBrowser,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInlineFallback, setShowInlineFallback] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [failedFavicons, setFailedFavicons] = useState<Record<string, boolean>>({});

  // Normalize searchQueries
  const cleanQueries = useMemo<string[]>(() => {
    if (!Array.isArray(searchQueries)) return [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const q of searchQueries) {
      const trimmed = typeof q === 'string' ? q.trim() : '';
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
    return result;
  }, [searchQueries]);

  // Deduplicate and sanitize groundingChunk sources
  const sources = useMemo<CleanSource[]>(() => {
    if (!Array.isArray(groundingChunks) || groundingChunks.length === 0) return [];

    const seenUrls = new Set<string>();
    const list: CleanSource[] = [];

    for (let i = 0; i < groundingChunks.length; i++) {
      const chunk = groundingChunks[i];
      if (!chunk?.web?.uri) continue;

      const rawUri = chunk.web.uri.trim();
      if (!rawUri || !rawUri.startsWith('http')) continue;

      let normalized = rawUri;
      let domain = 'web';
      try {
        const parsed = new URL(rawUri);
        domain = parsed.hostname.replace(/^www\./, '');
        normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname.replace(/\/$/, '')}`;
      } catch {
        normalized = rawUri;
      }

      if (seenUrls.has(normalized)) continue;
      seenUrls.add(normalized);

      const rawTitle = (chunk.web.title || '').trim();
      const displayTitle = rawTitle || domain;
      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

      list.push({
        id: `src-${i}-${domain}`,
        url: rawUri,
        title: displayTitle,
        domain,
        faviconUrl,
      });
    }

    return list;
  }, [groundingChunks]);

  // Close popup on Escape key
  useEffect(() => {
    if (!isPopupOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPopupOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopupOpen]);

  const hasSearchQueries = cleanQueries.length > 0;

  if (!hasSearchQueries && sources.length === 0) {
    return null;
  }

  const handleCopy = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => {
      setCopiedUrl((prev) => (prev === url ? null : prev));
    }, 2000);
  };

  const openSourcesPopup = (query?: string) => {
    setActiveQuery(query || cleanQueries[0] || null);
    setIsPopupOpen(true);
  };

  const visibleSources = isExpanded ? sources : sources.slice(0, 4);
  const hasMore = sources.length > 4;

  // Compact Popup Window displaying the original sources/links used for searchQueries
  const popupWindow =
    isPopupOpen && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsPopupOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sources-popup-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[82vh] flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-150"
            >
              {/* Popup Header */}
              <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/80 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      id="sources-popup-title"
                      className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate"
                    >
                      তথ্যসূত্র ও মূল সোর্সসমূহ
                    </h3>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                      {sources.length > 0
                        ? `${toBengaliNumerals(sources.length)}টি যাচাইকৃত ওয়েব সোর্স পাওয়া গেছে`
                        : `${toBengaliNumerals(cleanQueries.length)}টি অনুসন্ধান কোয়েরি`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPopupOpen(false)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
                  title="বন্ধ করুন"
                  aria-label="বন্ধ করুন"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popup Body */}
              <div className="p-4 overflow-y-auto space-y-4 flex-1">
                {/* Used Search Queries */}
                {cleanQueries.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-blue-500" />
                      <span>অনুসন্ধানের জন্য ব্যবহৃত কোয়েরি:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cleanQueries.map((query, idx) => {
                        const isSelected = activeQuery === query;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveQuery(query)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-blue-400'
                            }`}
                          >
                            <Search className="w-3 h-3 shrink-0 opacity-80" />
                            <span>{query}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Original Sources & Links List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>মূল সোর্স ও লিঙ্কসমূহ:</span>
                    </span>
                    {activeQuery && (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(activeQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <span>Google-এ খুঁজুন</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {sources.length > 0 ? (
                    <div className="space-y-2">
                      {sources.map((source, index) => {
                        const hasFailedFavicon = Boolean(failedFavicons[source.domain]);
                        return (
                          <div
                            key={source.id}
                            className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 hover:border-blue-400/70 dark:hover:border-blue-600/70 transition-all flex items-start justify-between gap-3"
                          >
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/70 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 mt-0.5">
                                {toBengaliNumerals(index + 1)}
                              </span>

                              <div className="shrink-0 w-6 h-6 rounded-md bg-white dark:bg-stone-800 flex items-center justify-center overflow-hidden border border-stone-200 dark:border-stone-700 mt-0.5">
                                {!hasFailedFavicon ? (
                                  <img
                                    src={source.faviconUrl}
                                    alt=""
                                    className="w-4 h-4 object-contain"
                                    onError={() => {
                                      setFailedFavicons((prev) => ({
                                        ...prev,
                                        [source.domain]: true,
                                      }));
                                    }}
                                  />
                                ) : (
                                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-semibold text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400 line-clamp-2 leading-snug block"
                                >
                                  {source.title}
                                </a>
                                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate">
                                  <span className="font-semibold text-stone-600 dark:text-stone-300">
                                    {source.domain}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate opacity-80">{source.url}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {onOpenBrowser && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsPopupOpen(false);
                                    onOpenBrowser(source.url, 'web', {
                                      urls: sources.map((s) => ({ url: s.url, title: s.title })),
                                      topics: cleanQueries,
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                                  title="মিনি ব্রাউজারে পড়ুন"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => handleCopy(source.url, e)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  copiedUrl === source.url
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800'
                                }`}
                                title={copiedUrl === source.url ? 'লিংক কপি হয়েছে!' : 'লিংক কপি করুন'}
                              >
                                {copiedUrl === source.url ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                                title="নতুন ট্যাবে মূল সোর্স খুলুন"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Graceful fallback if searchQueries exist without explicit groundingChunk URLs */
                    <div className="space-y-2">
                      {cleanQueries.map((query, idx) => {
                        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/50 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0 flex-1">
                              <a
                                href={googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline truncate block"
                              >
                                Google Search: "{query}"
                              </a>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-mono truncate mt-0.5">
                                {googleSearchUrl}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {onOpenBrowser && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsPopupOpen(false);
                                    onOpenBrowser(query, 'search');
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[11px] font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
                                >
                                  ব্রাউজারে খুঁজুন
                                </button>
                              )}
                              <a
                                href={googleSearchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-stone-500 hover:text-blue-600 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors"
                                title="নতুন ট্যাবে খুলুন"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Popup Footer */}
              <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-950/80 flex items-center justify-between gap-2 shrink-0 text-xs">
                {sources.length > 0 && onOpenBrowser ? (
                  <button
                    type="button"
                    onClick={() => {
                      const first = sources[0];
                      setIsPopupOpen(false);
                      onOpenBrowser(first.url, 'web', {
                        urls: sources.map((s) => ({ url: s.url, title: s.title })),
                        topics: cleanQueries,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>মিনি ব্রাউজারে সবগুলো পড়ুন</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    Google Search Grounding দ্বারা যাচাইকৃত
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setIsPopupOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div
      className={`mt-4 pt-3.5 border-t border-stone-200/80 dark:border-stone-800/80 ${className}`}
    >
      {/* 'তথ্যসূত্র' Section Trigger when searchQueries are present */}
      {hasSearchQueries && (
        <div
          id="ai-references-section"
          className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-stone-50/80 dark:from-blue-950/35 dark:via-indigo-950/20 dark:to-stone-900/60 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => openSourcesPopup()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-900 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-98"
              title="এই অনুসন্ধানের মূল সোর্স ও লিঙ্কগুলো পপআপ উইন্ডোতে দেখুন"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>তথ্যসূত্র</span>
              {sources.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-900/70 text-blue-700 dark:text-blue-200 text-[10px] font-bold">
                  {toBengaliNumerals(sources.length)}টি সোর্স
                </span>
              )}
              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
            </button>

            <div className="flex items-center gap-2">
              {sources.length > 0 && (
                <div className="hidden sm:flex items-center -space-x-1.5">
                  {sources.slice(0, 4).map((s) => (
                    <span
                      key={s.id}
                      className="w-5 h-5 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center overflow-hidden shadow-2xs"
                      title={s.domain}
                    >
                      {!failedFavicons[s.domain] ? (
                        <img
                          src={s.faviconUrl}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                          onError={() =>
                            setFailedFavicons((prev) => ({ ...prev, [s.domain]: true }))
                          }
                        />
                      ) : (
                        <Globe className="w-3 h-3 text-blue-500" />
                      )}
                    </span>
                  ))}
                </div>
              )}

              {sources.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInlineFallback((v) => !v)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-white/80 dark:hover:bg-stone-800/80 transition-colors cursor-pointer"
                >
                  <span>{showInlineFallback ? 'ইনলাইন লুকান' : 'ইনলাইনে দেখুন'}</span>
                  {showInlineFallback ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search Query Chips inside 'তথ্যসূত্র' (Click opens sources popup) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1 shrink-0">
              <Search className="w-3 h-3 text-blue-500" />
              <span>অনুসন্ধান:</span>
            </span>
            {cleanQueries.map((query, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => openSourcesPopup(query)}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg bg-white/90 hover:bg-blue-50 dark:bg-stone-800 dark:hover:bg-blue-950/50 text-stone-700 hover:text-blue-700 dark:text-stone-300 dark:hover:text-blue-300 border border-stone-200/80 hover:border-blue-300 dark:border-stone-700 transition-colors cursor-pointer"
                title={`"${query}" এর তথ্যসূত্র পপআপে দেখুন`}
              >
                <span>"{query}"</span>
                <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Inline Grounding Sources (Shown automatically if no searchQueries, or when toggled via 'ইনলাইনে দেখুন') */}
      {sources.length > 0 && (!hasSearchQueries || showInlineFallback) && (
        <div>
          {/* Header bar with Badges & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs">
                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>গুগল সার্চ গ্রাউন্ডিং তথ্যসূত্র</span>
              </div>
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                {toBengaliNumerals(sources.length)}টি বিশ্বস্ত সোর্স
              </span>
            </div>

            {/* View Toggle & Popup/Open All Action */}
            <div className="flex items-center gap-1.5 shrink-0">
              {sources.length > 1 && onOpenBrowser && (
                <button
                  type="button"
                  onClick={() => {
                    const first = sources[0];
                    onOpenBrowser(first.url, 'web', {
                      urls: sources.map((s) => ({ url: s.url, title: s.title })),
                      topics: cleanQueries,
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                  title="সবগুলো তথ্যসূত্র মিনি গুগল ব্রাউজারে ব্রাউজ করুন"
                >
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  <span className="hidden sm:inline">সবগুলো পড়ুন</span>
                </button>
              )}

              {sources.length > 1 && (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-2xs font-semibold'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                    title="কার্ড ভিউ"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('compact')}
                    className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
                      viewMode === 'compact'
                        ? 'bg-white dark:bg-stone-700 text-blue-600 dark:text-blue-300 shadow-2xs font-semibold'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                    }`}
                    title="কম্প্যাক্ট লিংক ভিউ"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sources Display: Cards View */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {visibleSources.map((source, index) => {
                const hasFailedFavicon = Boolean(failedFavicons[source.domain]);

                return (
                  <div
                    key={source.id}
                    className="group/card relative flex flex-col justify-between p-3 rounded-xl border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-blue-400/80 dark:hover:border-blue-600 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200 text-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md bg-stone-100 dark:bg-stone-800 text-[10px] font-bold text-stone-600 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60">
                        {toBengaliNumerals(index + 1)}
                      </span>

                      <div className="shrink-0 w-6 h-6 rounded-md bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden border border-stone-200/60 dark:border-stone-700/60 mt-0.5">
                        {!hasFailedFavicon ? (
                          <img
                            src={source.faviconUrl}
                            alt=""
                            className="w-4 h-4 object-contain"
                            onError={() => {
                              setFailedFavicons((prev) => ({ ...prev, [source.domain]: true }));
                            }}
                          />
                        ) : (
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenBrowser) {
                              onOpenBrowser(source.url, 'web', {
                                urls: sources.map((s) => ({ url: s.url, title: s.title })),
                                topics: cleanQueries,
                              });
                            }
                          }}
                          className="text-left cursor-pointer w-full group-hover/card:text-blue-600 dark:group-hover/card:text-blue-400 transition-colors"
                          title={source.title}
                        >
                          <h4 className="font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                            {source.title}
                          </h4>
                        </button>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-1 flex items-center gap-1 font-mono">
                          <span>{source.domain}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-1 text-[11px]">
                      {onOpenBrowser ? (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenBrowser(source.url, 'web', {
                              urls: sources.map((s) => ({ url: s.url, title: s.title })),
                              topics: cleanQueries,
                            });
                          }}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors cursor-pointer"
                          title="মিনি গুগল ব্রাউজারে পড়ুন"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>মিনি ব্রাউজার</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400 font-medium">যাচাইকৃত লিংক</span>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(source.url, e)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            copiedUrl === source.url
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800'
                          }`}
                          title={copiedUrl === source.url ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}
                        >
                          {copiedUrl === source.url ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                          title="নতুন ট্যাবে খুলুন"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sources Display: Compact Badges / Links View */}
          {viewMode === 'compact' && (
            <div className="flex flex-wrap gap-1.5">
              {visibleSources.map((source, index) => {
                const hasFailedFavicon = Boolean(failedFavicons[source.domain]);

                return (
                  <div
                    key={source.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-stone-200/90 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-xs transition-all shadow-2xs group"
                  >
                    <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                      [{toBengaliNumerals(index + 1)}]
                    </span>

                    <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                      {!hasFailedFavicon ? (
                        <img
                          src={source.faviconUrl}
                          alt=""
                          className="w-3.5 h-3.5 object-contain"
                          onError={() => {
                            setFailedFavicons((prev) => ({ ...prev, [source.domain]: true }));
                          }}
                        />
                      ) : (
                        <Globe className="w-3 h-3 text-blue-500" />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenBrowser) {
                          onOpenBrowser(source.url, 'web', {
                            urls: sources.map((s) => ({ url: s.url, title: s.title })),
                            topics: cleanQueries,
                          });
                        }
                      }}
                      className="font-medium text-stone-800 dark:text-stone-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 max-w-[180px] sm:max-w-[260px] truncate text-left cursor-pointer"
                      title={source.title}
                    >
                      {source.title}
                    </button>

                    <div className="flex items-center gap-0.5 ml-1 border-l border-stone-200 dark:border-stone-700 pl-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleCopy(source.url, e)}
                        className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
                        title={copiedUrl === source.url ? 'কপি হয়েছে' : 'কপি করুন'}
                      >
                        {copiedUrl === source.url ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-0.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                        title="নতুন ট্যাবে খুলুন"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show more / collapse button */}
          {hasMore && (
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 dark:text-stone-400 hover:text-blue-600 dark:hover:text-blue-300 py-1 px-2.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>সংক্ষেপ করুন</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>আরও {toBengaliNumerals(sources.length - 4)}টি তথ্যসূত্র দেখুন</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {popupWindow}
    </div>
  );
};
