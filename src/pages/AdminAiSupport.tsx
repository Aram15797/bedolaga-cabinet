import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTelegramSDK } from '@/hooks/useTelegramSDK';
import { cn } from '@/lib/utils';
import {
  aiSupportApi,
  type AiSupportSettings,
  type KnowledgeSource,
  type AiMessageItem,
} from '@/api/aiSupport';
import {
  SparklesIcon,
  SettingsIcon,
  FileTextIcon,
  HistoryIcon,
  TrashIcon,
} from '@/components/icons';

const EDITABLE_FIELDS = [
  { key: 'SYSTEM_PROMPT', label: 'Системный промпт', type: 'textarea', rows: 6 },
  { key: 'MODEL', label: 'Модель ИИ', type: 'text' },
  { key: 'EMBEDDING_MODEL', label: 'Модель эмбеддингов', type: 'text' },
  { key: 'MAX_TOKENS', label: 'Макс. токенов ответа', type: 'number' },
  { key: 'TEMPERATURE', label: 'Температура (0.0 - 1.0)', type: 'text' },
  { key: 'TOP_K', label: 'Кол-во примеров (Top K)', type: 'number' },
  { key: 'MIN_SCORE', label: 'Мин. релевантность (0-1)', type: 'text' },
  { key: 'CONTEXT_MESSAGES', label: 'Сообщений в контексте', type: 'number' },
  { key: 'HISTORY_LIMIT', label: 'Лимит истории (сообщений)', type: 'number' },
  {
    key: 'DAILY_MESSAGE_LIMIT',
    label: 'Лимит сообщений на пользователя в день (0 = без лимита)',
    type: 'number',
  },
  { key: 'VISION_ENABLED', label: 'Анализ фото (1 / 0)', type: 'text' },
  { key: 'INCLUDE_REMNAWAVE_DATA', label: 'Данные Remnawave (1 / 0)', type: 'text' },
];

export default function AdminAiSupport() {
  const queryClient = useQueryClient();
  const { safeAreaInset, contentSafeAreaInset } = useTelegramSDK();
  const safeTop = Math.max(safeAreaInset.top, contentSafeAreaInset.top);
  const safeBottom = Math.max(safeAreaInset.bottom, contentSafeAreaInset.bottom);

  const [activeTab, setActiveTab] = useState<'settings' | 'knowledge' | 'history'>('settings');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery<AiSupportSettings>({
    queryKey: ['ai-support-settings'],
    queryFn: aiSupportApi.getSettings,
  });

  const { data: knowledgeData, isLoading: isKnowledgeLoading } = useQuery({
    queryKey: ['ai-support-knowledge'],
    queryFn: aiSupportApi.getKnowledgeSummary,
  });



  // Local settings state
  const [formSettings, setFormSettings] = useState<Record<string, string>>({});

  // Sync settings query to local state once loaded
  const currentSettings = settingsData ? { ...settingsData, ...formSettings } : formSettings;

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => aiSupportApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-settings'] });
      setNotice('Настройки ИИ успешно сохранены');
      setError(null);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || 'Ошибка сохранения настроек');
    },
  });

  const uploadKnowledgeMutation = useMutation({
    mutationFn: (file: File) => aiSupportApi.uploadKnowledge(file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-knowledge'] });
      setNotice(
        `Файл обработан! Загружено чанков: ${res.chunk_count}, сообщений: ${res.message_count}`,
      );
      setError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err: any) => {
      const serverMsg = err?.response?.data?.detail;
      setError(serverMsg ? `Ошибка: ${serverMsg}` : 'Ошибка загрузки файла базы знаний');
    },
  });

  const toggleSourceMutation = useMutation({
    mutationFn: (sourceId: number) => aiSupportApi.toggleSource(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-knowledge'] });
    },
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (sourceId: number) => aiSupportApi.deleteSource(sourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-support-knowledge'] });
      setNotice('Источник базы знаний удален');
    },
  });

  const handleSettingChange = (key: string, val: string) => {
    setFormSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const payloadToSave: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(({ key }) => {
      const val = currentSettings[key];
      if (val !== undefined) {
        payloadToSave[key] = val;
      }
    });
    updateSettingsMutation.mutate(payloadToSave);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadKnowledgeMutation.mutate(file);
    }
  };

  const [selectedTelegramId, setSelectedTelegramId] = useState<number | null>(null);
  const [convPage, setConvPage] = useState(1);

  const { data: conversationsData, isLoading: isConversationsLoading } = useQuery({
    queryKey: ['ai-support-conversations', convPage],
    queryFn: () => aiSupportApi.getConversations(convPage, 30),
    enabled: activeTab === 'history',
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['ai-support-history', page, selectedTelegramId],
    queryFn: () => aiSupportApi.getHistory(page, 50, selectedTelegramId ?? undefined),
    enabled: activeTab === 'history',
  });

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 overflow-hidden px-4 sm:px-6"
        style={{
          paddingTop: safeTop > 0 ? `${safeTop}px` : 'env(safe-area-inset-top, 0px)',
          paddingBottom: safeBottom > 0 ? `${safeBottom}px` : 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <SparklesIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-dark-50 light:text-champagne-900 sm:text-xl">
                ИИ Бот Поддержки
              </h1>
              <p className="text-xs text-dark-400 light:text-champagne-600">
                Управление моделями, промптами, RAG базой знаний и диалогами поддержки
              </p>
            </div>
          </div>

          {/* Stats quick view */}
          <div className="flex items-center gap-2">
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/40 px-3 py-1.5 light:border-champagne-300/50 light:bg-champagne-100/60">
              <span className="block text-2xs text-dark-500 light:text-champagne-600">Источников RAG</span>
              <span className="font-mono text-xs font-bold text-accent-400">
                {knowledgeData?.sources?.length ?? 0}
              </span>
            </div>
            <div className="rounded-xl border border-dark-700/50 bg-dark-800/40 px-3 py-1.5 light:border-champagne-300/50 light:bg-champagne-100/60">
              <span className="block text-2xs text-dark-500 light:text-champagne-600">Чанков в базе</span>
              <span className="font-mono text-xs font-bold text-success-400">
                {knowledgeData?.chunk_total ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {notice && (
          <div className="flex items-center justify-between rounded-xl border border-success-400/30 bg-success-400/10 px-4 py-2.5 text-xs font-medium text-success-400">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="hover:opacity-80">✕</button>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-error-400/30 bg-error-400/10 px-4 py-2.5 text-xs font-medium text-error-400">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="hover:opacity-80">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex shrink-0 items-center border-b border-dark-700/50 light:border-champagne-300/50">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === 'settings'
                ? 'border-accent-500 text-accent-400'
                : 'border-transparent text-dark-400 hover:text-dark-200 light:text-champagne-600 light:hover:text-champagne-900',
            )}
          >
            <SettingsIcon className="h-4 w-4" />
            Настройки ИИ
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === 'knowledge'
                ? 'border-accent-500 text-accent-400'
                : 'border-transparent text-dark-400 hover:text-dark-200 light:text-champagne-600 light:hover:text-champagne-900',
            )}
          >
            <FileTextIcon className="h-4 w-4" />
            База знаний RAG
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors',
              activeTab === 'history'
                ? 'border-accent-500 text-accent-400'
                : 'border-transparent text-dark-400 hover:text-dark-200 light:text-champagne-600 light:hover:text-champagne-900',
            )}
          >
            <HistoryIcon className="h-4 w-4" />
            Диалоги и Чаты ИИ
          </button>
        </div>

        {/* Content Container */}
        <div className="scrollbar-hide min-h-0 flex-1 overflow-auto pb-6">
          {/* TAB 1: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl">
              {isSettingsLoading ? (
                <div className="py-12 text-center text-xs text-dark-400">Загрузка настроек...</div>
              ) : (
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="rounded-2xl border border-dark-700/50 bg-dark-800/30 p-4 space-y-4 backdrop-blur-xl light:border-champagne-300/50 light:bg-champagne-100/40">
                    {EDITABLE_FIELDS.map(({ key, label, type, rows }) => (
                      <div key={key} className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-dark-200 light:text-champagne-800">
                          {label}
                        </label>
                        {type === 'textarea' ? (
                          <textarea
                            rows={rows || 4}
                            value={currentSettings[key] || ''}
                            onChange={(e) => handleSettingChange(key, e.target.value)}
                            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 p-3 font-mono text-xs text-dark-100 outline-none transition-all focus:border-accent-500/40 light:border-champagne-300/60 light:bg-champagne-50 light:text-champagne-900"
                          />
                        ) : (
                          <input
                            type={type}
                            value={currentSettings[key] || ''}
                            onChange={(e) => handleSettingChange(key, e.target.value)}
                            className="w-full rounded-xl border border-dark-700/50 bg-dark-800/60 px-3 py-2 text-xs text-dark-100 outline-none transition-all focus:border-accent-500/40 light:border-champagne-300/60 light:bg-champagne-50 light:text-champagne-900"
                          />
                        )}
                      </div>
                    ))}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={updateSettingsMutation.isPending}
                        className="rounded-xl bg-accent-500 px-5 py-2.5 text-xs font-bold text-dark-50 transition-all hover:bg-accent-400 disabled:opacity-50"
                      >
                        {updateSettingsMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: KNOWLEDGE BASE */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              {/* Upload section */}
              <div className="rounded-2xl border border-dark-700/50 bg-dark-800/30 p-4 backdrop-blur-xl light:border-champagne-300/50 light:bg-champagne-100/40">
                <h3 className="mb-2 text-xs font-bold text-dark-100 light:text-champagne-900">
                  Загрузить знания (JSON)
                </h3>
                <p className="mb-3 text-2xs text-dark-400 light:text-champagne-600">
                  Загрузите JSON файл с документацией или ответами саппорта. Файл будет разделен на чанки и проиндексирован векторной моделью.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="block w-full max-w-sm text-xs text-dark-300 file:mr-3 file:rounded-xl file:border-0 file:bg-accent-500/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-accent-400 hover:file:bg-accent-500/30 light:text-champagne-700"
                  />
                  {uploadKnowledgeMutation.isPending && (
                    <span className="text-2xs text-accent-400 animate-pulse">Обработка файла ИИ...</span>
                  )}
                </div>
              </div>

              {/* Sources Table */}
              <div className="rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden backdrop-blur-xl light:border-champagne-300/50 light:bg-champagne-100/40">
                <div className="px-4 py-3 border-b border-dark-700/30 light:border-champagne-300/30">
                  <h3 className="text-xs font-bold text-dark-100 light:text-champagne-900">
                    Источники знаний ({knowledgeData?.sources?.length ?? 0})
                  </h3>
                </div>

                {isKnowledgeLoading ? (
                  <div className="py-12 text-center text-xs text-dark-400">Загрузка источников...</div>
                ) : !knowledgeData?.sources?.length ? (
                  <div className="py-12 text-center text-xs text-dark-400">База знаний пока пуста</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-dark-200 light:text-champagne-800">
                      <thead className="bg-dark-700/20 text-2xs uppercase text-dark-400 light:bg-champagne-200/50 light:text-champagne-600">
                        <tr>
                          <th className="px-4 py-2.5">Файл</th>
                          <th className="px-4 py-2.5">Чанков</th>
                          <th className="px-4 py-2.5">Сообщений</th>
                          <th className="px-4 py-2.5">Статус</th>
                          <th className="px-4 py-2.5">Дата</th>
                          <th className="px-4 py-2.5 text-right">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700/20 light:divide-champagne-300/30">
                        {knowledgeData.sources.map((src: KnowledgeSource) => (
                          <tr key={src.id} className="hover:bg-dark-700/10 light:hover:bg-champagne-200/30">
                            <td className="px-4 py-3 font-mono font-medium text-dark-100 light:text-champagne-900">
                              {src.filename}
                              {src.title && <span className="block text-2xs font-sans text-dark-400">{src.title}</span>}
                            </td>
                            <td className="px-4 py-3 font-mono text-accent-400">{src.chunk_count}</td>
                            <td className="px-4 py-3 font-mono text-dark-300">{src.message_count}</td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'rounded-md px-2 py-0.5 text-2xs font-semibold',
                                  src.is_active
                                    ? 'bg-success-400/10 text-success-400 border border-success-400/20'
                                    : 'bg-dark-700/40 text-dark-400 border border-dark-700/50',
                                )}
                              >
                                {src.is_active ? 'Активен' : 'Отключен'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-2xs text-dark-400">
                              {src.created_at ? new Date(src.created_at).toLocaleString() : '--'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => toggleSourceMutation.mutate(src.id)}
                                  className="rounded-lg border border-dark-700/50 bg-dark-800/40 px-2.5 py-1 text-2xs font-medium text-dark-200 hover:border-accent-500/40 light:border-champagne-300/50 light:bg-champagne-200/50"
                                >
                                  {src.is_active ? 'Выключить' : 'Включить'}
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Удалить источник ${src.filename}?`)) {
                                      deleteSourceMutation.mutate(src.id);
                                    }
                                  }}
                                  className="rounded-lg border border-error-400/20 bg-error-400/10 p-1 text-error-400 hover:bg-error-400/20"
                                >
                                  <TrashIcon className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HISTORY & CHATS */}
          {activeTab === 'history' && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left Column: Conversations List */}
              <div className="lg:col-span-5 flex flex-col rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden backdrop-blur-xl light:border-champagne-300/50 light:bg-champagne-100/40">
                <div className="p-3.5 border-b border-dark-700/30 flex items-center justify-between light:border-champagne-300/30">
                  <div>
                    <h3 className="text-xs font-bold text-dark-100 light:text-champagne-900">
                      Чаты пользователей ({conversationsData?.total ?? 0})
                    </h3>
                    <p className="text-2xs text-dark-400">Выберите диалог для просмотра</p>
                  </div>
                  {selectedTelegramId !== null && (
                    <button
                      onClick={() => {
                        setSelectedTelegramId(null);
                        setPage(1);
                      }}
                      className="rounded-lg bg-dark-700/50 px-2.5 py-1 text-2xs font-semibold text-dark-200 hover:bg-dark-700"
                    >
                      Показать все
                    </button>
                  )}
                </div>

                <div className="divide-y divide-dark-700/20 overflow-y-auto max-h-[600px] light:divide-champagne-300/30">
                  {isConversationsLoading ? (
                    <div className="py-8 text-center text-xs text-dark-400">Загрузка диалогов...</div>
                  ) : !conversationsData?.conversations?.length ? (
                    <div className="py-8 text-center text-xs text-dark-400">Диалогов пока нет</div>
                  ) : (
                    conversationsData.conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setSelectedTelegramId(conv.telegram_id);
                          setPage(1);
                        }}
                        className={cn(
                          'p-3.5 cursor-pointer transition-colors hover:bg-dark-700/20 light:hover:bg-champagne-200/40',
                          selectedTelegramId === conv.telegram_id
                            ? 'bg-accent-500/10 border-l-4 border-accent-500'
                            : '',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-dark-100 light:text-champagne-900">
                              TG: {conv.telegram_id}
                            </span>
                            {conv.escalated && (
                              <span className="rounded bg-error-400/20 border border-error-400/30 px-1.5 py-0.5 text-2xs font-bold text-error-400 animate-pulse">
                                Требует оператора
                              </span>
                            )}
                          </div>
                          <span className="text-2xs text-dark-500">
                            {conv.last_message_at ? new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        <p className="text-xs text-dark-300 light:text-champagne-700 line-clamp-2 mb-1.5 font-sans">
                          {conv.last_message_role === 'assistant' ? '🤖 ' : '👤 '}
                          {conv.last_message || 'Нет сообщений'}
                        </p>

                        <div className="flex items-center justify-between text-2xs text-dark-500">
                          <span>Сообщений: {conv.message_count}</span>
                          <span>{conv.updated_at ? new Date(conv.updated_at).toLocaleDateString() : ''}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pagination for conversations */}
                {conversationsData && conversationsData.total > 30 && (
                  <div className="p-3 border-t border-dark-700/30 flex items-center justify-between light:border-champagne-300/30">
                    <button
                      disabled={convPage <= 1}
                      onClick={() => setConvPage((p) => Math.max(p - 1, 1))}
                      className="rounded-lg border border-dark-700/50 px-2 py-1 text-2xs text-dark-300 disabled:opacity-40"
                    >
                      Назад
                    </button>
                    <span className="text-2xs font-mono text-dark-400">Стр. {convPage}</span>
                    <button
                      disabled={!conversationsData.has_next}
                      onClick={() => setConvPage((p) => p + 1)}
                      className="rounded-lg border border-dark-700/50 px-2 py-1 text-2xs text-dark-300 disabled:opacity-40"
                    >
                      Вперед
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Messenger Chat Flow */}
              <div className="lg:col-span-7 flex flex-col rounded-2xl border border-dark-700/50 bg-dark-800/30 overflow-hidden backdrop-blur-xl light:border-champagne-300/50 light:bg-champagne-100/40">
                <div className="p-3.5 border-b border-dark-700/30 flex items-center justify-between light:border-champagne-300/30">
                  <div>
                    <h3 className="text-xs font-bold text-dark-100 light:text-champagne-900">
                      {selectedTelegramId ? `Чат с пользователем TG ID: ${selectedTelegramId}` : 'Все сообщения (общий лог)'}
                    </h3>
                    <p className="text-2xs text-dark-400">
                      {selectedTelegramId ? 'История вопросов и ответов ИИ в реальном времени' : 'Общий поток всех сообщений сервиса'}
                    </p>
                  </div>

                  {historyData && (
                    <div className="flex items-center gap-2">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        className="rounded-lg border border-dark-700/50 px-2 py-1 text-2xs text-dark-300 disabled:opacity-40"
                      >
                        Назад
                      </button>
                      <span className="text-2xs font-mono text-dark-400">Стр. {page}</span>
                      <button
                        disabled={!historyData.has_next}
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-dark-700/50 px-2 py-1 text-2xs text-dark-300 disabled:opacity-40"
                      >
                        Вперед
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[600px]">
                  {isHistoryLoading ? (
                    <div className="py-12 text-center text-xs text-dark-400">Загрузка сообщений...</div>
                  ) : !historyData?.messages?.length ? (
                    <div className="py-12 text-center text-xs text-dark-400">Сообщения отсутствуют</div>
                  ) : (
                    historyData.messages.map((msg: AiMessageItem) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex flex-col max-w-[85%]',
                          msg.role === 'user' ? 'self-start' : 'self-end items-end',
                        )}
                      >
                        {/* Message Bubble Header */}
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="font-mono text-2xs font-bold text-dark-400">
                            {msg.role === 'user' ? `👤 Пользователь (${msg.telegram_id})` : '🤖 ИИ Бот'}
                          </span>
                          <span className="text-2xs text-dark-500">
                            {msg.created_at ? new Date(msg.created_at).toLocaleString() : ''}
                          </span>
                        </div>

                        {/* Message Content Bubble */}
                        <div
                          className={cn(
                            'rounded-2xl p-3.5 text-xs text-dark-100 whitespace-pre-wrap leading-relaxed shadow-sm',
                            msg.role === 'user'
                              ? 'bg-dark-700/60 border border-dark-600/50 rounded-tl-none light:bg-champagne-200/70 light:border-champagne-300/80 light:text-champagne-900'
                              : 'bg-accent-500/15 border border-accent-500/30 text-dark-50 rounded-tr-none light:bg-accent-500/10 light:text-champagne-900',
                          )}
                        >
                          {msg.content}
                        </div>

                        {/* Metadata Footer for Assistant */}
                        {msg.role === 'assistant' && (msg.tokens_prompt || msg.tokens_completion || msg.used_context) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2.5 px-1 text-2xs text-dark-400 light:text-champagne-600">
                            {msg.model && <span className="font-mono text-dark-500">{msg.model}</span>}
                            {msg.tokens_prompt !== null && (
                              <span>Промпт: <strong className="text-dark-300">{msg.tokens_prompt}</strong></span>
                            )}
                            {msg.tokens_completion !== null && (
                              <span>Ответ: <strong className="text-dark-300">{msg.tokens_completion}</strong></span>
                            )}
                            {msg.used_context && msg.used_context.length > 0 && (
                              <span className="text-accent-400 font-semibold">
                                RAG чанков: {msg.used_context.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

