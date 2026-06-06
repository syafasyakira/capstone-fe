const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper: get auth token from localStorage
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ── Auth ──────────────────────────────────────────────────────

export const loginAPI = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login gagal' }));
    throw new Error(err.error || 'Login gagal');
  }
  return res.json();
};

export const registerAPI = async (full_name: string, email: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registrasi gagal' }));
    throw new Error(err.error || 'Registrasi gagal');
  }
  return res.json();
};

// ── Chat ─────────────────────────────────────────────────────

export interface ChatResponse {
  chat_id: string;
  message: string;
  status: string;
  needs_escalation: boolean;
  tokens_used: number;
}

export const sendMessageToAI = async (
  message: string,
  imageUrl?: string,
  history: any[] = [],
  chat_id?: string
): Promise<ChatResponse> => {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message, imageUrl, history, chat_id }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Koneksi bermasalah' }));
    throw new Error(err.error || `Koneksi bermasalah (${res.status})`);
  }
  return res.json();
};

export const getChatHistory = async (chatId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/chat/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil chat');
  return res.json();
};

export const getUserChats = async () => {
  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil daftar chat');
  return res.json();
};

export const escalateToCS = async (chat_id: string, reason?: string) => {
  const res = await fetch(`${API_BASE_URL}/api/escalate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ chat_id, reason }),
  });
  if (!res.ok) throw new Error('Gagal mengalihkan ke CS');
  return res.json();
};

// ── CS Dashboard ──────────────────────────────────────────────

export const getCSAutoAssignedChat = async () => {
  const res = await fetch(`${API_BASE_URL}/api/cs/chats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil daftar chat CS');
  return res.json();
};

export const getCSChatDetail = async (chatId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/cs/chats/${chatId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil detail chat');
  return res.json();
};

export const sendCSMessage = async (chatId: string, message: string) => {
  const res = await fetch(`${API_BASE_URL}/api/cs/chats/${chatId}/message`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Gagal mengirim pesan');
  return res.json();
};

export const updateCSChatStatus = async (chatId: string, status: string) => {
  const res = await fetch(`${API_BASE_URL}/api/cs/chats/${chatId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Gagal mengupdate status');
  return res.json();
};

// ── Admin: Users ──────────────────────────────────────────────

export const getCSUsers = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil daftar user');
  return res.json();
};

export const createCSUser = async (email: string, password: string, full_name: string) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ email, password, full_name, role: 'customer_service' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal membuat user' }));
    throw new Error(err.error || 'Gagal membuat user');
  }
  return res.json();
};

export const updateCSUser = async (userId: string, full_name?: string, email?: string, password?: string) => {
  const body: any = {};
  if (full_name) body.full_name = full_name;
  if (email) body.email = email;
  if (password) body.password = password;
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Gagal mengupdate user');
  return res.json();
};

export const deleteCSUser = async (userId: string) => {
  const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal menghapus user');
  return res.json();
};

// ── Admin: Monitoring ──────────────────────────────────────────

export const getMonitoringData = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/monitoring`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Gagal mengambil data monitoring');
  return res.json();
};

// ── Knowledge Base (RAG) ───────────────────────────────────────

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
}

export const getKnowledge = async (): Promise<KnowledgeItem[]> => {
  const res = await fetch(`${API_BASE_URL}/api/knowledge`);
  if (!res.ok) throw new Error('Gagal mengambil knowledge base');
  return res.json();
};

export const addKnowledge = async (item: Omit<KnowledgeItem, 'id'>): Promise<KnowledgeItem> => {
  const res = await fetch(`${API_BASE_URL}/api/knowledge`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Gagal menambah data');
  return res.json();
};

export const updateKnowledge = async (id: string, item: Omit<KnowledgeItem, 'id'>): Promise<KnowledgeItem> => {
  const res = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(item),
  });
  if (!res.ok) throw new Error('Gagal mengupdate data');
  return res.json();
};

export const deleteKnowledge = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Gagal menghapus data');
};

// ── Summary (Groq for monthly report) ─────────────────────────

export const getAISummary = async (history: any[]): Promise<{ message: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/summary`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ history }),
  });
  if (!res.ok) throw new Error('Gagal mendapatkan ringkasan');
  return res.json();
};
