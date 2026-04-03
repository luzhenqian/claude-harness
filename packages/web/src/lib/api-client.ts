import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  getMe: () => apiFetch<{ id: string; name: string; avatarUrl: string }>('/auth/me'),

  listConversations: () => apiFetch<any[]>('/conversations'),

  createConversation: (articleSlug?: string) =>
    apiFetch<any>('/conversations', { method: 'POST', body: JSON.stringify({ articleSlug }) }),

  deleteConversation: (id: string) =>
    apiFetch<void>(`/conversations/${id}`, { method: 'DELETE' }),

  updateConversation: (id: string, data: { title?: string }) =>
    apiFetch<any>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getMessages: (conversationId: string) =>
    apiFetch<any[]>(`/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string }) => {
    const token = getToken();
    return fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content, context }),
    });
  },
};
