// be/src/routes/chat.ts
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { callRAGModel, processRAGResponse } from '../config/ai.js';
import { authenticateToken } from '../middleware/auth.js';
import { ChatRequest, Message } from '../models/types.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
router.use(authenticateToken);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';

// ── Utility: Generate AI chat title ──────────────────────────
async function generateAIChatTitle(firstMessage: string): Promise<string> {
  if (!GEMINI_API_KEY) return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');

  try {
    const prompt = `Kamu bertugas memberi judul pada sebuah percakapan customer service berdasarkan pesan pertama user.

Pesan pertama user:
"${firstMessage.substring(0, 300)}"

Aturan judul:
- Maksimal 6 kata
- Bahasa yang sama dengan pesan user (Indonesia atau Inggris)
- Langsung ke inti masalah/topik, jangan generik
- Tanpa tanda kutip, tanpa titik di akhir
- Gaya natural seperti judul chat — contoh: "Printer L3150 Tidak Bisa Print", "Error Saat Install Driver", "Tinta Habis Tapi Tidak Keluar", "Cara Reset Waste Ink Epson"
- HANYA tulis judulnya saja, tidak ada kalimat lain

Judul:`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 25 },
    }, { timeout: 10000 });

    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    // Bersihkan: hapus tanda kutip, titik di akhir, newline
    const title = raw.replace(/^["']|["']$/g, '').replace(/\.$/, '').split('')[0].trim();
    return title || firstMessage.substring(0, 50);
  } catch {
    return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
  }
}

// ── POST /chat ────────────────────────────────────────────────
router.post('/', async (req: Request<{}, {}, ChatRequest>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { message, image_url, chat_id } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: 'Pesan tidak boleh kosong.' }); return;
    }

    console.log(`💬 New message from user ${userId}: ${message.substring(0, 50)}...`);

    let currentChatId: string;
    let existingChatStatus = 'ai';
    let csName: string | null = null;

    if (chat_id) {
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats').select('*, cs:cs_id(full_name)').eq('id', chat_id).eq('customer_id', userId).single();

      if (chatError || !chat) { res.status(404).json({ error: 'Chat tidak ditemukan.' }); return; }

      currentChatId = chat_id;
      existingChatStatus = chat.status || 'ai';
      csName = (chat.cs as any)?.full_name || null;

      if (existingChatStatus === 'solved') {
        res.status(403).json({ error: 'Sesi chat ini sudah ditutup permanen. Silakan buat sesi chat baru.' }); return;
      }

      if (existingChatStatus === 'with_cs' || existingChatStatus === 'waiting_cs') {
        await supabaseAdmin.from('messages').insert({
          chat_id: currentChatId, sender_id: userId, role: 'user',
          content: message, image_url: image_url || null,
        });
        res.json({ chat_id: currentChatId, message: '', status: existingChatStatus, cs_name: csName, needs_escalation: false, tokens_used: 0 });
        return;
      }
    } else {
      // Fix 6: Judul dari AI, bukan teks mentah
      const aiTitle = await generateAIChatTitle(message);

      const { data: newChat, error: createError } = await supabaseAdmin
        .from('chats').insert({
          customer_id: userId,
          title: aiTitle,
          preview: message.substring(0, 100),
          status: 'ai',
        }).select().single();

      if (createError || !newChat) {
        console.error('❌ Chat Creation Error:', createError?.message);
        res.status(500).json({ error: 'Gagal membuat chat baru.' }); return;
      }

      currentChatId = newChat.id;
      console.log(`✅ New chat created: ${currentChatId} with title: "${aiTitle}"`);
    }

    // Simpan pesan user
    await supabaseAdmin.from('messages').insert({
      chat_id: currentChatId, sender_id: userId, role: 'user',
      content: message, image_url: image_url || null,
    });

    // Ambil history
    const { data: messageHistory } = await supabaseAdmin
      .from('messages').select('*').eq('chat_id', currentChatId).order('created_at', { ascending: true });

    const formattedHistory = (messageHistory || []).map((msg: Message) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // Panggil RAG
    console.log(`📡 Calling RAG model...`);
    const ragResponse = await callRAGModel(userId, message, formattedHistory);
    const processed = processRAGResponse(ragResponse);

    let chatStatus = 'ai';
    if (processed.needs_escalation) { chatStatus = 'waiting_cs'; }

    // Simpan response bot
    await supabaseAdmin.from('messages').insert({
      chat_id: currentChatId, sender_id: null, role: 'assistant', content: processed.message,
    });

    // Update chat preview
    await supabaseAdmin.from('chats').update({
      status: chatStatus,
      preview: processed.message.substring(0, 100),
    }).eq('id', currentChatId);

    res.json({
      chat_id: currentChatId,
      message: processed.message,
      status: chatStatus,
      cs_name: csName,
      needs_escalation: processed.needs_escalation,
      tokens_used: processed.tokens_used,
    });
  } catch (e: any) {
    console.error('❌ Chat Error:', e.message);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses chat.' });
  }
});

// ── POST /chat/generate-title ─────────────────────────────────
router.post('/generate-title', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'Message diperlukan.' }); return; }
    const title = await generateAIChatTitle(message);
    res.json({ title });
  } catch (e: any) {
    res.json({ title: (req.body.message || '').substring(0, 50) });
  }
});

// ── GET /chat/:chatId ─────────────────────────────────────────
router.get('/:chatId', async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chatId } = req.params;

    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats').select('*, cs:cs_id(full_name)').eq('id', chatId).eq('customer_id', userId).single();

    if (chatError || !chat) { res.status(404).json({ error: 'Chat tidak ditemukan.' }); return; }

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });

    if (messagesError) { res.status(500).json({ error: 'Gagal mengambil pesan.' }); return; }

    res.json({ chat, messages: messages || [] });
  } catch (e: any) {
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

// ── GET /chat ─────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;

    const { data: chats, error } = await supabaseAdmin
      .from('chats').select('*').eq('customer_id', userId).order('created_at', { ascending: false });

    if (error) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }

    res.json({ chats: chats || [] });
  } catch (e: any) {
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

export default router;