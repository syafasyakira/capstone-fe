// frontend/src/services/api.ts

/**
 * URL Backend diambil dari .env (VITE_API_URL=http://localhost:3001)
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Interface untuk struktur response dari API Backend
 */
interface ChatResponse {
  message: string;
  role: 'assistant';
  status: 'success' | 'warning' | 'error';
}

/**
 * 1. Fungsi Utama: Mengirim Chat, Gambar, dan Riwayat ke AI
 * @param message - Teks pertanyaan user saat ini
 * @param imageUrl - Data gambar (Base64 string) jika ada
 * @param history - Array riwayat percakapan sebelumnya agar AI punya konteks
 */
export const sendMessageToAI = async (
  message: string, 
  imageUrl?: string, 
  history: any[] = []
): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Mengirimkan semua data yang dibutuhkan backend untuk pengenalan gambar & history
      body: JSON.stringify({ 
        message, 
        imageUrl,
        history 
      }),
    });

    if (!response.ok) {
      // Menangani error spesifik (seperti Payload Too Large 413)
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Koneksi bermasalah (${response.status})`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('API Service Error (Chat):', error);
    throw error;
  }
};

/**
 * 2. Fungsi Summary: Meminta ringkasan dari riwayat percakapan
 * @param history - Riwayat percakapan lengkap yang akan diringkas
 */
export const getAISummary = async (history: any[]): Promise<ChatResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ history }),
    });

    if (!response.ok) throw new Error('Gagal mendapatkan ringkasan.');
    return await response.json();
  } catch (error: any) {
    console.error('API Service Error (Summary):', error);
    throw error;
  }
};

/**
 * 3. Fungsi Login (Opsional - Untuk Auth masa depan)
 */
export const loginUser = async (credentials: { email: string; password: string }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login gagal.');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error (Login):', error);
    throw error;
  }
};

/**
 * 4. Fungsi Ambil History (Jika sudah integrasi database)
 */
export const getChatHistory = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/history`);
    if (!response.ok) throw new Error('Gagal mengambil riwayat.');
    return await response.json();
  } catch (error) {
    console.error('API Error (History):', error);
    throw error;
  }
};