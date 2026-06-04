const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ChatResponse {
  message: string;
  role: 'assistant';
  status: 'success' | 'warning' | 'error';
}

export const sendMessageToAI = async (
  message: string,
  imageUrl?: string,
  history: any[] = []
): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, imageUrl, history }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Koneksi bermasalah (${response.status})`);
  }
  return response.json();
};

export const getAISummary = async (history: any[]): Promise<ChatResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history }),
  });
  if (!response.ok) throw new Error('Gagal mendapatkan ringkasan.');
  return response.json();
};

// ── Knowledge Base (RAG) ──────────────────────────────────────

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
}

export const getKnowledge = async (): Promise<KnowledgeItem[]> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge`);
  if (!response.ok) throw new Error('Gagal mengambil knowledge base.');
  return response.json();
};

export const addKnowledge = async (item: Omit<KnowledgeItem, 'id'>): Promise<KnowledgeItem> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error('Gagal menambah data.');
  return response.json();
};

export const updateKnowledge = async (id: string, item: Omit<KnowledgeItem, 'id'>): Promise<KnowledgeItem> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  });
  if (!response.ok) throw new Error('Gagal mengupdate data.');
  return response.json();
};

export const deleteKnowledge = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/api/knowledge/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Gagal menghapus data.');
};
