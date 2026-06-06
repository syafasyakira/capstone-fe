// be/src/routes/cs.ts
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
router.use(authenticateToken);
router.use(requireRole('customer_service', 'admin'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-2.0-flash';

// ── GET /cs/chats ─────────────────────────────────────────────
router.get('/chats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const userRole = req.user!.role;

    console.log(`🔍 GET /cs/chats — userId: ${userId}, role: ${userRole}`);

    let chats: any[] = [];

    if (userRole === 'customer_service') {
      // Query 1: aktif (waiting_cs/with_cs) — belum ada CS atau milik CS ini
      const { data: activeChats, error: e1 } = await supabaseAdmin
        .from('chats')
        .select('id, customer_id, cs_id, title, preview, status, created_at, profiles:customer_id(id, full_name, email)')
        .in('status', ['waiting_cs', 'with_cs'])
        .or(`cs_id.eq.${userId},cs_id.is.null`)
        .order('created_at', { ascending: false });
      console.log(`  Q1 activeChats: ${activeChats?.length ?? 0}, error: ${e1?.message ?? 'none'}`);
      if (e1) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }

      // Query 2: history milik CS ini (cs_id = userId)
      const { data: myHistory, error: e2 } = await supabaseAdmin
        .from('chats')
        .select('id, customer_id, cs_id, title, preview, status, created_at, profiles:customer_id(id, full_name, email)')
        .in('status', ['solved', 'unsolved'])
        .eq('cs_id', userId)
        .order('created_at', { ascending: false });
      console.log(`  Q2 myHistory: ${myHistory?.length ?? 0}, error: ${e2?.message ?? 'none'}`);
      if (e2) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }

      // Query 3: unsolved yang cs_id MASIH NULL (eskalasi customer, belum sempat di-claim)
      const { data: unclaimedUnsolved, error: e3 } = await supabaseAdmin
        .from('chats')
        .select('id, customer_id, cs_id, title, preview, status, created_at, profiles:customer_id(id, full_name, email)')
        .eq('status', 'unsolved')
        .is('cs_id', null)
        .order('created_at', { ascending: false });
      console.log(`  Q3 unclaimedUnsolved: ${unclaimedUnsolved?.length ?? 0}, error: ${e3?.message ?? 'none'}`);
      if (e3) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }

      // Gabungkan, dedupe by id, sort
      const merged = [...(activeChats || []), ...(myHistory || []), ...(unclaimedUnsolved || [])];
      const seen = new Set<string>();
      chats = merged
        .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      console.log(`  total merged: ${chats.length}`);
    } else {
      // Admin: ambil semua
      const { data: allChats, error } = await supabaseAdmin
        .from('chats')
        .select('id, customer_id, cs_id, title, preview, status, created_at, profiles:customer_id(id, full_name, email)')
        .in('status', ['waiting_cs', 'with_cs', 'solved', 'unsolved'])
        .order('created_at', { ascending: false });
      if (error) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }
      chats = allChats || [];
    }

    // Enrich dengan cs handler name
    const enriched = await Promise.all((chats || []).map(async (chat: any) => {
      let csHandlerName = null;
      if (chat.cs_id) {
        const { data: cs } = await supabaseAdmin.from('profiles').select('full_name').eq('id', chat.cs_id).single();
        csHandlerName = cs?.full_name || null;
      }
      return {
        ...chat,
        userName: (chat.profiles as any)?.full_name || null,
        csHandlerName,
        assignedToCSId: chat.cs_id,
      };
    }));

    res.json({ chats: enriched, count: enriched.length });
  } catch (e: any) {
    console.error('❌ Get CS Chats Error:', e.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

// ── GET /cs/chats/:chatId ─────────────────────────────────────
router.get('/chats/:chatId', async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chatId } = req.params;

    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats').select('*').eq('id', chatId)
      .in('status', ['waiting_cs', 'with_cs', 'solved', 'unsolved']).single();

    if (chatError || !chat) { res.status(404).json({ error: 'Chat tidak ditemukan.' }); return; }

    // Auto-assign ke CS jika belum ada & masih waiting
    if (!chat.cs_id && chat.status === 'waiting_cs') {
      await supabaseAdmin.from('chats').update({ cs_id: userId, status: 'with_cs' }).eq('id', chatId);
      chat.cs_id = userId;
      chat.status = 'with_cs';
    }

    let csHandlerName: string | null = null;
    if (chat.cs_id) {
      const { data: csProfile } = await supabaseAdmin.from('profiles').select('full_name').eq('id', chat.cs_id).single();
      csHandlerName = csProfile?.full_name || null;
    }

    const { data: customerProfile } = await supabaseAdmin.from('profiles').select('full_name, email').eq('id', chat.customer_id).single();

    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('id, chat_id, sender_id, role, content, image_url, created_at, profiles:sender_id(full_name, email, role)')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) { res.status(500).json({ error: 'Gagal mengambil pesan.' }); return; }

    res.json({
      chat: { ...chat, cs_handler_name: csHandlerName, customer_name: customerProfile?.full_name },
      messages: messages || [],
    });
  } catch (e: any) {
    console.error('❌ Get CS Chat Error:', e.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

// ── POST /cs/chats/:chatId/message ────────────────────────────
// Fix 3: CS bisa kirim pesan + gambar
router.post('/chats/:chatId/message', async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chatId } = req.params;
    const { message, image_url } = req.body;

    if (!message?.trim() && !image_url) { res.status(400).json({ error: 'Pesan atau gambar harus ada.' }); return; }

    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats').select('*').eq('id', chatId).in('status', ['waiting_cs', 'with_cs']).single();

    if (chatError || !chat) { res.status(404).json({ error: 'Chat tidak ditemukan.' }); return; }
    if (chat.cs_id && chat.cs_id !== userId) { res.status(403).json({ error: 'Chat ini sedang ditangani oleh CS lain.' }); return; }

    const { data: savedMsg, error: saveError } = await supabaseAdmin
      .from('messages').insert({
        chat_id: chatId,
        sender_id: userId,
        role: 'cs',
        content: message || '',
        image_url: image_url || null,
      }).select().single();

    if (saveError) { res.status(500).json({ error: 'Gagal mengirim pesan.' }); return; }

    await supabaseAdmin.from('chats').update({
      status: 'with_cs',
      cs_id: userId,
      preview: (message || '📷 Gambar').substring(0, 100),
    }).eq('id', chatId);

    res.json({ message: 'Pesan berhasil dikirim.', data: savedMsg });
  } catch (e: any) {
    console.error('❌ Send CS Message Error:', e.message);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengirim pesan.' });
  }
});

// ── PATCH /cs/chats/:chatId/status ────────────────────────────
router.patch('/chats/:chatId/status', async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const { status } = req.body;

    if (!['solved', 'unsolved', 'waiting_cs', 'with_cs'].includes(status)) {
      res.status(400).json({ error: 'Status tidak valid.' }); return;
    }

    const updateData: any = { status };
    // Jangan null-kan cs_id saat solved — simpan siapa yang menangani untuk history

    const { error } = await supabaseAdmin.from('chats').update(updateData).eq('id', chatId);
    if (error) { res.status(500).json({ error: 'Gagal mengupdate status.' }); return; }

    res.json({ message: 'Status berhasil diupdate.', chat_id: chatId, status });
  } catch (e: any) {
    console.error('❌ Update Chat Status Error:', e.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

// ── POST /cs/chats/:chatId/summary ────────────────────────────
// Fix 4: Generate AI summary setelah chat selesai
router.post('/chats/:chatId/summary', async (req: Request<{ chatId: string }>, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;

    // Get chat metadata
    const { data: chat } = await supabaseAdmin
      .from('chats').select('*, cs:cs_id(full_name), customer:customer_id(full_name)').eq('id', chatId).single();

    // Get all messages
    const { data: messages } = await supabaseAdmin
      .from('messages').select('role, content, image_url, created_at').eq('chat_id', chatId).order('created_at', { ascending: true });

    if (!messages || messages.length === 0) {
      res.json({ summary: 'Tidak ada percakapan untuk diringkas.' }); return;
    }

    const csName = (chat?.cs as any)?.full_name || 'CS';
    const customerName = (chat?.customer as any)?.full_name || 'Customer';
    const startTime = new Date(chat?.created_at || '').toLocaleString('id-ID');
    const endTime = new Date().toLocaleString('id-ID');

    const historyText = messages.map((m: any) => {
      const roleName = m.role === 'user' ? customerName : m.role === 'cs' ? csName : 'Bot AI';
      const imgNote = m.image_url ? ' [mengirim gambar]' : '';
      return `${roleName}: ${m.content}${imgNote}`;
    }).join('\n\n');

    if (!GEMINI_API_KEY) {
      res.json({
        summary: `Penanganan oleh ${csName}\nWaktu: ${startTime} - ${endTime}\n\nPercakapan telah selesai ditangani.`
      });
      return;
    }

    const prompt = `Kamu adalah asisten yang membuat ringkasan lengkap dan detail penanganan customer service.

Data penanganan:
- CS: ${csName}
- Customer: ${customerName}
- Waktu mulai: ${startTime}
- Waktu selesai: ${endTime}

Percakapan lengkap:
${historyText}

Buat ringkasan LENGKAP dan DETAIL dalam Bahasa Indonesia dengan format markdown berikut:

## Informasi Sesi
Tulis info CS, customer, dan waktu penanganan.

## Masalah yang Dilaporkan
Jelaskan secara detail masalah yang disampaikan customer, termasuk gejala, konteks, dan informasi produk yang relevan.

## Kronologi Penanganan
Uraikan langkah-langkah penanganan secara berurutan — apa yang ditanyakan CS, apa yang dijawab customer, solusi apa yang dicoba.

## Solusi yang Diberikan
Jelaskan secara lengkap solusi atau rekomendasi yang diberikan oleh Bot AI maupun CS. Sertakan langkah teknis jika ada.

## Hasil & Status
Apakah masalah terselesaikan? Apa tindak lanjut yang diperlukan jika ada?

## Catatan Tambahan
Hal-hal penting lain yang perlu dicatat untuk referensi ke depan.

Tulis dengan bahasa yang jelas, profesional, dan informatif. Tidak ada batasan panjang — prioritaskan kelengkapan informasi.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const geminiRes = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
    }, { timeout: 30000 });

    const summaryText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ summary: summaryText || 'Ringkasan tidak tersedia.' });
  } catch (e: any) {
    console.error('❌ CS Summary Error:', e.message);
    res.json({ summary: 'Tidak dapat membuat ringkasan saat ini.' });
  }
});

export default router;