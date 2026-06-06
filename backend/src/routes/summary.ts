// Summary route: Generate AI summary of chat history
// FIX: Sebelumnya memanggil RAG API yang punya keterbatasan untuk summary.
//      Sekarang langsung memanggil Gemini API (sama seperti RAG) tanpa vector search.
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
router.use(authenticateToken);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Buat ringkasan menggunakan Gemini API langsung (tanpa RAG / vector search)
 */
async function generateSummaryWithGemini(history: Array<{ role: string; content: string }>): Promise<string> {
  const historyText = history
    .map(m => `${m.role === 'user' ? 'Pengguna' : 'Bot AI'}: ${m.content}`)
    .join('\n\n');

  const prompt = `Kamu adalah asisten ringkas. Berikut adalah riwayat percakapan antara pengguna dan Bot AI Support Epson:

---
${historyText}
---

Buat ringkasan singkat dan jelas dari percakapan ini dalam Bahasa Indonesia. Fokus pada:
1. Masalah utama yang dilaporkan pengguna
2. Solusi atau langkah-langkah yang disarankan Bot
3. Apakah masalah terselesaikan atau tidak

Format ringkasan sebagai poin-poin singkat.`;

  const response = await axios.post(
    `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
      },
    },
    { timeout: 30000 }
  );

  // FIX: Akses data response dengan pengaman opsional yang koheren
  const candidates = response.data?.candidates;
  const firstCandidate = candidates && candidates[0];
  const text = firstCandidate?.content?.parts?.[0]?.text;

  if (!text) throw new Error('Gemini tidak mengembalikan teks');
  return text.trim();
}

/**
 * Fallback: buat ringkasan sederhana dari history tanpa AI
 */
function generateSimpleSummary(history: Array<{ role: string; content: string }>): string {
  const userMessages = history.filter(m => m.role === 'user');
  const botMessages = history.filter(m => m.role !== 'user');

  if (userMessages.length === 0) return 'Tidak ada percakapan untuk diringkas.';

  // FIX: Ambil pesan pertama user dengan aman
  const firstUser = userMessages[0];
  const firstUserMsg = firstUser ? firstUser.content.substring(0, 100) : '';
  const firstUserLength = firstUser ? firstUser.content.length : 0;

  // FIX: Ambil pesan terakhir bot secara aman menggunakan kontanta/variabel penampung
  const lastBotMessage = botMessages[botMessages.length - 1];
  const lastBotMsg = lastBotMessage ? lastBotMessage.content.substring(0, 150) : null;

  let summary = `📋 **Ringkasan Percakapan**\n\n`;
  summary += `• **Pertanyaan awal:** ${firstUserMsg}${firstUserLength > 100 ? '...' : ''}\n`;
  summary += `• **Total pesan:** ${history.length} (${userMessages.length} dari pengguna, ${botMessages.length} dari Bot)\n`;
  
  if (lastBotMsg && lastBotMessage) {
    summary += `• **Respons terakhir Bot:** ${lastBotMsg}${lastBotMessage.content.length > 150 ? '...' : ''}\n`;
  }

  return summary;
}

/**
 * POST /summary
 * Generate summary dari history chat
 * Body: { history: [{ role, content }] }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { history } = req.body;

    if (!history || !Array.isArray(history) || history.length === 0) {
      res.status(400).json({ error: 'History harus berupa array yang tidak kosong.' });
      return;
    }

    // Filter pesan yang valid
    const validHistory = history.filter(
      m => m && typeof m.role === 'string' && typeof m.content === 'string' && m.content.trim()
    );

    if (validHistory.length === 0) {
      res.json({ message: 'Tidak ada pesan valid untuk diringkas.' });
      return;
    }

    // Coba Gemini dulu, fallback ke simple summary jika gagal
    if (GEMINI_API_KEY) {
      try {
        console.log(`📝 [Summary] Generating with Gemini, ${validHistory.length} messages`);
        const summary = await generateSummaryWithGemini(validHistory);
        console.log(`✅ [Summary] Generated successfully`);
        res.json({ message: summary });
        return;
      } catch (geminiErr: any) {
        console.error('❌ [Summary] Gemini failed:', geminiErr.message);
        // Lanjut ke fallback
      }
    } else {
      console.warn('⚠️  [Summary] GEMINI_API_KEY tidak diset, pakai simple summary');
    }

    // Fallback: ringkasan tanpa AI
    const simpleSummary = generateSimpleSummary(validHistory);
    res.json({ message: simpleSummary });

  } catch (error: any) {
    console.error('❌ Summary Error:', error.message);
    res.status(500).json({
      message: 'Tidak dapat membuat ringkasan saat ini. Silakan coba lagi.',
    });
  }
});

export default router;