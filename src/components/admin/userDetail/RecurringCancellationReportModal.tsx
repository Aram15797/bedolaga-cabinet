import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  CreditCardIcon,
  InfoIcon,
  RefreshIcon,
  ShieldIcon,
  XCloseIcon,
  XIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import type { CancelAllRecurringResponse } from '@/api/adminUsers';

interface RecurringCancellationReportModalProps {
  open: boolean;
  onClose: () => void;
  report: CancelAllRecurringResponse | null;
  userName?: string;
}

export function RecurringCancellationReportModal({
  open,
  onClose,
  report,
  userName,
}: RecurringCancellationReportModalProps) {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !report) return null;

  const { summary, results } = report;

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'platega':
      case 'lava':
      case 'antilopay':
        return <RefreshIcon className="h-5 w-5 text-accent-400" />;
      case 'yookassa':
        return <CreditCardIcon className="h-5 w-5 text-blue-400" />;
      case 'bot_autopay':
        return <ShieldIcon className="h-5 w-5 text-purple-400" />;
      default:
        return <InfoIcon className="h-5 w-5 text-dark-400" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-report-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-dark-700/80 bg-dark-900 shadow-2xl shadow-dark-950/60 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl',
                summary.failed_count === 0 && summary.total_actions > 0
                  ? 'bg-success-500/15 text-success-400'
                  : summary.failed_count > 0
                    ? 'bg-warning-500/15 text-warning-400'
                    : 'bg-accent-500/15 text-accent-400',
              )}
            >
              {summary.failed_count === 0 && summary.total_actions > 0 ? (
                <CheckIcon className="h-6 w-6" />
              ) : summary.failed_count > 0 ? (
                <XIcon className="h-6 w-6" />
              ) : (
                <InfoIcon className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 id="recurring-report-title" className="text-lg font-semibold text-dark-100">
                {t('admin.users.recurringModal.title', 'Отчёт об отключении рекуррентов')}
              </h3>
              {userName && (
                <p className="text-xs text-dark-400">
                  {t('admin.users.recurringModal.user', 'Пользователь')}: {userName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-dark-400 transition-colors hover:bg-dark-800 hover:text-dark-200"
          >
            <XCloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-dark-800 bg-dark-800/40 p-3.5 text-center">
              <div className="text-xs text-dark-400">
                {t('admin.users.recurringModal.totalActions', 'Всего действий')}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-dark-100">
                {summary.total_actions}
              </div>
            </div>

            <div className="rounded-xl border border-success-500/20 bg-success-500/10 p-3.5 text-center">
              <div className="text-xs text-success-300">
                {t('admin.users.recurringModal.succeeded', 'Успешно')}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-success-400">
                {summary.success_count}
              </div>
            </div>

            <div className="rounded-xl border border-error-500/20 bg-error-500/10 p-3.5 text-center">
              <div className="text-xs text-error-300">
                {t('admin.users.recurringModal.failed', 'С ошибками')}
              </div>
              <div className="mt-1 text-xl font-bold tabular-nums text-error-400">
                {summary.failed_count}
              </div>
            </div>
          </div>

          {/* Main Message */}
          <div
            className={cn(
              'rounded-xl border p-4 text-sm font-medium',
              summary.failed_count === 0 && summary.total_actions > 0
                ? 'border-success-500/30 bg-success-500/10 text-success-300'
                : summary.failed_count > 0
                  ? 'border-warning-500/30 bg-warning-500/10 text-warning-300'
                  : 'border-dark-700 bg-dark-800/50 text-dark-300',
            )}
          >
            {report.message}
          </div>

          {/* Results List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-dark-400">
              {t('admin.users.recurringModal.detailsTitle', 'Детализация по платежным системам')}
            </h4>

            {results.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dark-700 p-6 text-center text-sm text-dark-400">
                {t(
                  'admin.users.recurringModal.emptyResults',
                  'У пользователя нет сохранённых рекуррентных подписок или методов оплаты',
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      'rounded-xl border p-4 transition-all',
                      item.status === 'success'
                        ? 'border-dark-700/80 bg-dark-800/50'
                        : item.status === 'error'
                          ? 'border-error-500/30 bg-error-500/5'
                          : 'border-dark-700/50 bg-dark-800/30',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dark-700/70">
                          {getProviderIcon(item.provider)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-dark-200">
                            {item.provider_title}
                          </div>
                          {item.target_id && (
                            <div className="font-mono text-xs text-dark-400">
                              {t('admin.users.recurringModal.targetId', 'ID')}: {item.target_id}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          item.status === 'success'
                            ? 'bg-success-500/15 text-success-400'
                            : item.status === 'error'
                              ? 'bg-error-500/15 text-error-400'
                              : 'bg-dark-700 text-dark-300',
                        )}
                      >
                        {item.status === 'success' && <CheckIcon className="h-3 w-3" />}
                        {item.status === 'error' && <XIcon className="h-3 w-3" />}
                        {item.status === 'success'
                          ? t('common.success', 'Успешно')
                          : item.status === 'error'
                            ? t('common.error', 'Ошибка')
                            : t('common.info', 'Инфо')}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-dark-300 leading-relaxed">{item.message}</div>

                    {item.error && (
                      <div className="mt-2 rounded-lg bg-error-950/40 p-2 font-mono text-[11px] text-error-400">
                        {item.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-dark-800 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-dark-700 px-5 py-2.5 text-sm font-medium text-dark-100 transition-colors hover:bg-dark-600 active:scale-[0.99]"
          >
            {t('common.close', 'Закрыть')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
