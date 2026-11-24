import React from 'react';
import { createPortal } from 'react-dom';
import { Mail, Send, ShieldAlert, X, Loader2, CheckCircle2, FileText } from 'lucide-react';

export interface GmailConfirmItem {
  to: string;
  subject: string;
  bodyPreview: string;
  projectLabel?: string;
}

interface GmailConfirmModalProps {
  isOpen: boolean;
  mode: 'send' | 'draft';
  senderEmail?: string | null;
  items: GmailConfirmItem[];
  isExecuting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const GmailConfirmModal: React.FC<GmailConfirmModalProps> = ({
  isOpen,
  mode,
  senderEmail,
  items,
  isExecuting = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  const isBatch = items.length > 1;
  const actionLabel =
    mode === 'draft'
      ? isBatch
        ? `${items.length}টি Gmail ড্রাফট সংরক্ষণ করবেন?`
        : 'এই ইমেইলটি Gmail ড্রাফটে সংরক্ষণ করবেন?'
      : isBatch
      ? `আপনি কি ${items.length}টি প্রাপকের কাছে সরাসরি Gmail পাঠাতে নিশ্চিত?`
      : 'আপনি কি সরাসরি Gmail পাঠাতে নিশ্চিত?';

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={() => {
        if (!isExecuting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gmail-confirm-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
              {mode === 'draft' ? <FileText className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3
                id="gmail-confirm-title"
                className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate"
              >
                {actionLabel}
              </h3>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 truncate">
                {senderEmail ? `প্রেরক: ${senderEmail}` : 'আপনার অনুমোদিত Gmail অ্যাকাউন্ট থেকে প্রেরণ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isExecuting}
            onClick={onCancel}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer disabled:opacity-40"
            aria-label="বাতিল করুন"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              {mode === 'draft'
                ? 'নিচের তথ্য অনুযায়ী আপনার Gmail অ্যাকাউন্টে অফিসিয়াল ড্রাফট তৈরি হবে। কোনো ইমেইল এখনই পাঠানো হবে না।'
                : 'নিশ্চিত করার পর নিচের প্রাপক(দের) কাছে আপনার Gmail অ্যাকাউন্ট থেকে সরাসরি ইমেইল চলে যাবে। পাঠানোর আগে তথ্য যাচাই করুন।'}
            </p>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                    প্রাপক: <span className="text-rose-600 dark:text-rose-400 font-mono">{item.to || '(ড্রাফট - প্রাপক নির্ধারিত নয়)'}</span>
                  </span>
                  {item.projectLabel && (
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-semibold">
                      {item.projectLabel}
                    </span>
                  )}
                </div>
                <div className="text-stone-700 dark:text-stone-300 font-semibold">
                  বিষয়: {item.subject || '(বিষয়বিহীন)'}
                </div>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-3 whitespace-pre-wrap border-t border-stone-200/70 dark:border-stone-800 pt-1.5">
                  {item.bodyPreview}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 flex items-center justify-end gap-2 shrink-0 text-xs">
          <button
            type="button"
            disabled={isExecuting}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            বাতিল (Cancel)
          </button>

          <button
            type="button"
            disabled={isExecuting}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-emerald-600 hover:brightness-110 text-white font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{mode === 'draft' ? 'ড্রাফট সেভ হচ্ছে...' : 'পাঠানো হচ্ছে...'}</span>
              </>
            ) : (
              <>
                {mode === 'draft' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                <span>
                  {mode === 'draft'
                    ? 'নিশ্চিত ও ড্রাফট সেভ করুন'
                    : isBatch
                    ? `নিশ্চিত করুন ও ${items.length}টি পাঠান`
                    : 'নিশ্চিত করুন ও Gmail পাঠান'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
