import apiClient from './client';

export interface AiSupportSettings {
  SYSTEM_PROMPT?: string;
  MODEL?: string;
  EMBEDDING_MODEL?: string;
  MAX_TOKENS?: string;
  TEMPERATURE?: string;
  TOP_K?: string;
  MIN_SCORE?: string;
  CONTEXT_MESSAGES?: string;
  HISTORY_LIMIT?: string;
  VISION_ENABLED?: string;
  INCLUDE_REMNAWAVE_DATA?: string;
  [key: string]: string | undefined;
}

export interface KnowledgeSource {
  id: number;
  filename: string;
  title: string | null;
  is_active: boolean;
  chunk_count: number;
  message_count: number;
  created_at: string;
}

export interface KnowledgeSummary {
  sources: KnowledgeSource[];
  chunk_total: number;
  message_total: number;
}

export interface AiMessageItem {
  id: number;
  conversation_id: number;
  telegram_id: number;
  role: string;
  content: string;
  has_media: boolean;
  media_type: string | null;
  model: string | null;
  tokens_prompt: number | null;
  tokens_completion: number | null;
  used_context: Array<{
    chunk_id?: number;
    score?: number;
    text?: string;
    source?: string;
  }> | null;
  created_at: string;
}

export interface AiHistoryResponse {
  messages: AiMessageItem[];
  page: number;
  per_page: number;
  total: number;
  has_next: boolean;
}

export const aiSupportApi = {
  getSettings: async (): Promise<AiSupportSettings> => {
    const response = await apiClient.get('/ai-support/settings');
    return response.data;
  },

  updateSettings: async (settings: Record<string, string>): Promise<{ status: string; settings: AiSupportSettings }> => {
    const response = await apiClient.post('/ai-support/settings', { settings });
    return response.data;
  },

  getKnowledgeSummary: async (): Promise<KnowledgeSummary> => {
    const response = await apiClient.get('/ai-support/knowledge');
    return response.data;
  },

  uploadKnowledge: async (file: File): Promise<{ status: string; chunk_count: number; message_count: number; skipped_duplicates: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/ai-support/knowledge/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  toggleSource: async (sourceId: number): Promise<{ status: string; source_id: number; is_active: boolean }> => {
    const response = await apiClient.post(`/ai-support/knowledge/${sourceId}/toggle`);
    return response.data;
  },

  deleteSource: async (sourceId: number): Promise<{ status: string; deleted_source_id: number }> => {
    const response = await apiClient.delete(`/ai-support/knowledge/${sourceId}`);
    return response.data;
  },

  getHistory: async (page = 1, perPage = 50): Promise<AiHistoryResponse> => {
    const response = await apiClient.get('/ai-support/history', {
      params: { page, per_page: perPage },
    });
    return response.data;
  },
};
