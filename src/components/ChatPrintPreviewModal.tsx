import React, { useEffect, useState } from 'react';
import Markdown from 'react-markdown';
import {
  X,
  Printer,
  Download,
  ArrowLeft,
  Clock,
  Globe,
  Sparkles,
  MessageSquare,
  Calendar,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  User,
  Bot,
} from 'lucide-react';
import { ChatSession } from '../types';
import { exportChatAsPDF, sanitizeFilename } from '../utils/exportChat';

interface ChatPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
}

const MODE_LABELS: Record<string, string> = {
  general: 'সাধারণ অ্যাসিস্ট্যান্ট (General)',
  citizen: 'জনসেবা ও A-Z সমাধান (Citizen)',
  coding: 'কোডিং ও সফটওয়্যার (Coding)',
  writing: 'লেখালেখি ও অনুবাদ (Writing)',
  research: 'গবেষণা ও ফ্যাক্ট-চেক (Research)',
  learning: 'পড়াশোনা ও কনসেপ্ট (Learning)',
};

export const ChatPrintPreviewModal: React.FC<ChatPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showSources, setShowSources] = useState(true);
  const [compactLayout, setCompactLayout] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfStatus, setPdfStatus] = useState('');
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('printing-chat-session');
      return;
    }

    document.body.classList.add('printing-chat-session');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('printing-chat-session');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const sessionTitle = session.title?.trim() || 'নতুন কথোপকথন';
  const modeLabel = MODE_LABELS[session.mode] || MODE_LABELS.general;
  const formattedCreatedDate = new Date(session.createdAt).toLocaleDateString('bn-BD', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedCreatedTime = new Date(session.createdAt).toLocaleTimeString('bn-BD', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const exportedDateLabel = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleTriggerBrowserPrint = () => {
    setErrorMsg(null);
    const previousTitle = document.title;
    const dateStamp = new Date().toISOString().slice(0, 10);
    document.title = `${sanitizeFilename(sessionTitle)}_${dateStamp}`;

    let restored = false;
    const restoreTitle = () => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);

    try {
      window.print();
    } catch (err: any) {
      console.error('Native print failed:', err);
      setErrorMsg('ব্রাউজারের প্রিন্ট ডায়ালগ খোলা যায়নি। নিচের "Download PDF" বাটন দিয়ে সরাসরি পিডিএফ সংরক্ষণ করুন।');
      restoreTitle();
    }

    setTimeout(restoreTitle, 4000);
  };

  const handleDirectDownloadPdf = async () => {
    try {
      setErrorMsg(null);
      setIsDownloadingPdf(true);
      setPdfStatus('পিডিএফ প্রস্তুত হচ্ছে...');
      await exportChatAsPDF(session, (status) => setPdfStatus(status));
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3500);
    } catch (err: any) {
      console.error('Direct PDF download failed:', err);
      setErrorMsg(err?.message || 'পিডিএফ ডাউনলোডে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsDownloadingPdf(false);
      setPdfStatus('');
    }
  };

  const printMarkdownComponents: any = {
    h1: ({ children }: any) => (
      <h1 className="text-lg font-bold text-slate-900 mt-3 mb-1.5">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-sm font-bold text-slate-900 mt-2.5 mb-1">{children}</h3>
    ),
    p: ({ children }: any) => (
      <p className="text-[13.5px] leading-relaxed text-slate-800 my-1.5 whitespace-pre-wrap break-words">
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc pl-5 my-1.5 space-y-1 text-[13.5px] text-slate-800">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal pl-5 my-1.5 space-y-1 text-[13.5px] text-slate-800">{children}</ol>
    ),
    li: ({ children }: any) => <li className="leading-relaxed break-words">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-emerald-600 bg-emerald-50/70 px-3 py-1.5 my-2 text-slate-700 italic rounded-r">
        {children}
      </blockquote>
    ),
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-emerald-700 underline break-all"
      >
        {children}
      </a>
    ),
    hr: () => <hr className="my-3 border-slate-200" />,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse border border-slate-300 text-xs text-slate-800">
          {children}
        </table>
      </div>
    ),
    th: ({ children }: any) => (
      <th className="border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-left font-bold">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="border border-slate-300 px-2.5 py-1.5 align-top">{children}</td>
    ),
    pre: ({ children }: any) => (
      <pre className="my-2.5 p-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-900 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
        {children}
      </pre>
    ),
    code: ({ className, children }: any) => {
      const isBlock = Boolean(className) || String(children).includes('\n');
      if (isBlock) {
        return <code className="font-mono text-[12px] text-slate-900">{children}</code>;
      }
      return (
        <code className="font-mono text-[12px] bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded border border-slate-200">
          {children}
        </code>
      );
    },
  };

  return (
    <div
      id="chat-print-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex flex-col overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Non-printing Sticky Preview Control Toolbar */}
      <div
        className="print:hidden no-print shrink-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-3 sm:px-6 py-3 shadow-md z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back & Print View Heading */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              id="print-preview-back-btn"
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold border border-stone-200 dark:border-stone-700 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ফিরে যান</span>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                  Print-Friendly Chat View (PDF)
                </h2>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                {sessionTitle} • {session.messages.length}টি বার্তা
              </p>
            </div>
          </div>

          {/* Middle/Right: Options & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Option Toggles */}
            <div className="hidden md:flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-xl border border-stone-200 dark:border-stone-700 text-[11px]">
              <button
                type="button"
                onClick={() => setShowTimestamps((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  showTimestamps
                    ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="বার্তার সময় দেখান বা লুকান"
              >
                <Clock className="w-3 h-3" />
                <span>সময়</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSources((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  showSources
                    ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="সার্চ তথ্যসূত্র দেখান বা লুকান"
              >
                <Globe className="w-3 h-3" />
                <span>তথ্যসূত্র</span>
              </button>
              <button
                type="button"
                onClick={() => setCompactLayout((v) => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  compactLayout
                    ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
                title="কমপ্যাক্ট পেজ লেআউট"
              >
                <span>কমপ্যাক্ট</span>
              </button>
            </div>

            {/* Direct jsPDF Download Fallback */}
            <button
              id="print-preview-download-pdf-btn"
              type="button"
              onClick={handleDirectDownloadPdf}
              disabled={isDownloadingPdf || session.messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 disabled:opacity-50 transition-colors cursor-pointer"
              title="সরাসরি .pdf ফাইল ডাউনলোড করুন"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span className="hidden sm:inline">{pdfStatus || 'ডাউনলোড হচ্ছে...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>PDF ডাউনলোড</span>
                </>
              )}
            </button>

            {/* Primary Native Print / Save as PDF Trigger */}
            <button
              id="print-preview-trigger-print-btn"
              type="button"
              onClick={handleTriggerBrowserPrint}
              disabled={session.messages.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-sm transition-colors cursor-pointer active:scale-95"
              title="প্রিন্ট ডায়ালগ খুলে 'Save as PDF' হিসেবে সেভ করুন"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              id="print-preview-close-btn"
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="প্রিন্ট প্রিভিউ বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Status Banners */}
        {(pdfSuccess || errorMsg) && (
          <div className="max-w-5xl mx-auto mt-2">
            {pdfSuccess && (
              <div className="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PDF ফাইল সফলভাবে তৈরি ও ডাউনলোড হয়েছে!</span>
              </div>
            )}
            {errorMsg && (
              <div className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Paper Sheet Area */}
      <div
        className="flex-1 overflow-y-auto py-5 sm:py-8 px-3 sm:px-6 print:overflow-visible print:p-0"
        onClick={onClose}
      >
        <div
          id="chat-print-sheet"
          onClick={(e) => e.stopPropagation()}
          className={`max-w-[820px] mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl border border-stone-200 print:shadow-none print:border-0 print:rounded-none ${
            compactLayout ? 'p-5 sm:p-7' : 'p-6 sm:p-10'
          }`}
        >
          {/* Document Header */}
          <div className="border-b-2 border-emerald-600 pb-4 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-600 text-white text-[11px] font-bold">
                    AI
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                    AI Assistant &amp; Coding Studio
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                  {sessionTitle}
                </h1>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                {modeLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formattedCreatedDate}, {formattedCreatedTime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                মোট বার্তা: {session.messages.length}টি
              </span>
              {session.enableSearch && (
                <span className="inline-flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  Search Grounding সক্রিয়
                </span>
              )}
            </div>
          </div>

          {/* Conversation Messages */}
          {session.messages.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              এই চ্যাট সেশনে এখনো কোনো কথোপকথন নেই।
            </div>
          ) : (
            <div className={compactLayout ? 'space-y-3' : 'space-y-5'}>
              {session.messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const timeStr = new Date(msg.timestamp).toLocaleTimeString('bn-BD', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <article
                    key={msg.id}
                    className={`print-message-card rounded-xl border ${
                      isUser
                        ? 'border-sky-200 bg-sky-50/50'
                        : 'border-slate-200 bg-white'
                    } ${compactLayout ? 'p-3.5' : 'p-4 sm:p-5'}`}
                  >
                    {/* Sender Header */}
                    <div
                      className={`flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-dashed ${
                        isUser ? 'border-sky-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white ${
                            isUser ? 'bg-sky-600' : 'bg-emerald-600'
                          }`}
                        >
                          {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isUser ? 'text-sky-900' : 'text-emerald-900'
                          }`}
                        >
                          {isUser ? 'ব্যবহারকারী (User)' : 'এআই সহকারী (AI Assistant)'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          #{index + 1}
                        </span>
                      </div>

                      {showTimestamps && (
                        <span className="text-[11px] text-slate-500 font-medium">{timeStr}</span>
                      )}
                    </div>

                    {/* Generated Image Preview if attached */}
                    {msg.generatedImage?.url && (
                      <div className="mb-3">
                        <img
                          src={msg.generatedImage.url}
                          alt={msg.generatedImage.prompt || 'Generated AI Image'}
                          className="max-h-72 rounded-lg border border-slate-200 object-contain"
                        />
                        {msg.generatedImage.prompt && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            প্রম্পট: {msg.generatedImage.prompt}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Message Markdown Body */}
                    <div className="text-slate-800 max-w-none break-words">
                      {msg.text ? (
                        <Markdown components={printMarkdownComponents}>{msg.text}</Markdown>
                      ) : (
                        <p className="text-xs italic text-slate-400">(খালি বার্তা)</p>
                      )}
                    </div>

                    {/* Error Notice if message ended in error */}
                    {msg.error && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                        ত্রুটি: {msg.error}
                      </div>
                    )}

                    {/* Grounding Sources & Search Queries */}
                    {showSources &&
                      ((msg.groundingChunks && msg.groundingChunks.length > 0) ||
                        (msg.searchQueries && msg.searchQueries.length > 0)) && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-xs space-y-1.5">
                          {msg.searchQueries && msg.searchQueries.length > 0 && (
                            <p className="text-[11px] text-slate-600">
                              <strong className="text-slate-700">অনুসন্ধান:</strong>{' '}
                              {msg.searchQueries.join(' • ')}
                            </p>
                          )}

                          {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                            <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-2.5">
                              <div className="font-bold text-emerald-900 text-[11px] mb-1">
                                তথ্যসূত্র (Sources):
                              </div>
                              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-800">
                                {msg.groundingChunks.map((chunk, cIdx) =>
                                  chunk.web ? (
                                    <li key={cIdx} className="break-all">
                                      <span className="font-semibold">
                                        {chunk.web.title || 'Source'}:{' '}
                                      </span>
                                      <a
                                        href={chunk.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline text-emerald-700"
                                      >
                                        {chunk.web.uri}
                                      </a>
                                    </li>
                                  ) : null
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}

          {/* Document Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>AI Assistant &amp; Coding Studio — Chat Transcript</span>
            <span>প্রস্তুতকৃত: {exportedDateLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
