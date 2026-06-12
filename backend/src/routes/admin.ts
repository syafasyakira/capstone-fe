// Admin routes: User management, monitoring, top-issues
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { AuthRequest, UserRole } from '../models/types.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const router = Router();
router.use(authenticateToken);
router.use(requireRole('admin'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';

// ── GET /admin/users ──────────────────────────────────────────
router.get('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('full_name', { ascending: true });

    if (error) { res.status(500).json({ error: 'Gagal mengambil daftar pengguna.' }); return; }
    res.json({ users: users || [], pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan.' }); }
});

// ── POST /admin/users ─────────────────────────────────────────
router.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, full_name, role = 'customer' } = req.body;
    if (!email || !password || !full_name) { res.status(400).json({ error: 'Email, password, dan nama harus diisi.' }); return; }
    if (!['customer', 'admin', 'customer_service'].includes(role)) { res.status(400).json({ error: 'Role tidak valid.' }); return; }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password,
      user_metadata: { full_name, role },
      email_confirm: true,
    });
    if (authError) { res.status(400).json({ error: `Gagal membuat pengguna: ${authError.message}` }); return; }

    const userId = authData.user.id;
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({ id: userId, email, full_name, role });
    if (profileError && !profileError.message.includes('duplicate')) { res.status(500).json({ error: 'Gagal membuat profil.' }); return; }

    res.status(201).json({ message: 'Pengguna berhasil dibuat.', user: { id: userId, email, full_name, role } });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan pada server.' }); }
});

// ── GET /admin/users/:userId ──────────────────────────────────
router.get('/users/:userId', async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
  try {
    const { data: user, error } = await supabaseAdmin.from('profiles').select('*').eq('id', req.params.userId).single();
    if (error || !user) { res.status(404).json({ error: 'Pengguna tidak ditemukan.' }); return; }
    res.json({ user });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan.' }); }
});

// ── PATCH /admin/users/:userId ────────────────────────────────
router.patch('/users/:userId', async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { full_name, email, role, password } = req.body;

    if (role && !['customer', 'admin', 'customer_service'].includes(role)) { res.status(400).json({ error: 'Role tidak valid.' }); return; }

    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const { error } = await supabaseAdmin.from('profiles').update(updateData).eq('id', userId);
    if (error) { res.status(500).json({ error: 'Gagal mengupdate pengguna.' }); return; }

    // Update password jika diberikan
    if (password) {
      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (pwErr) console.error('Password update error:', pwErr.message);
    }

    res.json({ message: 'Pengguna berhasil diupdate.', user_id: userId });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan.' }); }
});

// ── DELETE /admin/users/:userId ───────────────────────────────
router.delete('/users/:userId', async (req: Request<{ userId: string }>, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', userId);
    if (profileError) { res.status(500).json({ error: 'Gagal menghapus pengguna.' }); return; }
    await supabaseAdmin.auth.admin.deleteUser(userId);
    res.json({ message: 'Pengguna berhasil dihapus.', user_id: userId });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan.' }); }
});

// ── GET /admin/monitoring ─────────────────────────────────────
// Fix 5: Filter by month & year from query params
router.get('/monitoring', async (req: Request, res: Response): Promise<void> => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : null; // 1-indexed
    const year = req.query.year ? parseInt(req.query.year as string) : null;

    // Build date range filter
    let dateFilter: any = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      dateFilter = { gte: startDate, lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1).toISOString();
      const endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
      dateFilter = { gte: startDate, lte: endDate };
    }

    let query = supabaseAdmin.from('chats').select('status, created_at');
    if (dateFilter.gte) {
      query = query.gte('created_at', dateFilter.gte).lte('created_at', dateFilter.lte);
    }
    const { data: chats } = await query;

    // Previous month for comparison
    let prevChats: any[] = [];
    if (month && year) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevStart = new Date(prevYear, prevMonth - 1, 1).toISOString();
      const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59).toISOString();
      const { data } = await supabaseAdmin.from('chats').select('status').gte('created_at', prevStart).lte('created_at', prevEnd);
      prevChats = data || [];
    }

    const curr = chats || [];
    const total = curr.length;
    const solved = curr.filter((c: any) => c.status === 'solved').length;
    const pending = curr.filter((c: any) => c.status === 'waiting_cs' || c.status === 'with_cs').length;

    const prevTotal = prevChats.length;
    const prevSolved = prevChats.filter((c: any) => c.status === 'solved').length;

    const calcChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? '+100%' : '0%';
      const pct = Math.round(((curr - prev) / prev) * 100);
      return pct >= 0 ? `+${pct}%` : `${pct}%`;
    };

    res.json({
      chats: {
        total,
        solved,
        pending,
        waiting_cs: curr.filter((c: any) => c.status === 'waiting_cs').length,
        with_cs: curr.filter((c: any) => c.status === 'with_cs').length,
        ai: curr.filter((c: any) => c.status === 'ai').length,
      },
      total_change: calcChange(total, prevTotal),
      solved_change: calcChange(solved, prevSolved),
      pending_change: '—',
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error('❌ Monitoring Error:', e.message);
    res.status(500).json({ error: 'Gagal mengambil data monitoring.' });
  }
});

// ── Cache untuk top-issues (hindari rate limit Gemini) ────────
const topIssuesCache: Record<string, { issues: string[]; cachedAt: number }> = {};
const TOP_ISSUES_TTL_MS = 10 * 60 * 1000; // cache 10 menit

// ── GET /admin/top-issues ─────────────────────────────────────
// Fix 7: Analyze top issues from chat messages using Gemini
router.get('/top-issues', async (req: Request, res: Response): Promise<void> => {
  try {
    const month = req.query.month ? parseInt(req.query.month as string) : null;
    const year = req.query.year ? parseInt(req.query.year as string) : null;

    // Cek cache dulu sebelum panggil Gemini
    const cacheKey = `${month ?? 'all'}-${year ?? 'all'}`;
    const cached = topIssuesCache[cacheKey];
    if (cached && Date.now() - cached.cachedAt < TOP_ISSUES_TTL_MS) {
      res.json({ issues: cached.issues, fromCache: true });
      return;
    }

    // Ambil pesan-pesan user dalam periode ini
    let chatQuery = supabaseAdmin.from('chats').select('id');
    if (month && year) {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      chatQuery = chatQuery.gte('created_at', startDate).lte('created_at', endDate);
    }
    const { data: chats, error: chatError } = await chatQuery;
    console.log(`[top-issues] month=${month} year=${year} chats found=${chats?.length} error=${chatError?.message}`);
    if (!chats || chats.length === 0) { res.json({ issues: [] }); return; }

    const chatIds = chats.map((c: any) => c.id);

    // Ambil pesan user saja (bukan bot/cs)
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select('content')
      .in('chat_id', chatIds)
      .eq('role', 'user')
      .limit(200);
    console.log(`[top-issues] messages found=${messages?.length} error=${msgError?.message}`);
    if (!messages || messages.length === 0) { res.json({ issues: [] }); return; }

    if (!GEMINI_API_KEY) {
      // Fallback: return title-based analysis
      const { data: chatTitles } = await supabaseAdmin.from('chats').select('title').in('id', chatIds).limit(50);
      const issues = (chatTitles || []).slice(0, 5).map((c: any) => c.title);
      res.json({ issues });
      return;
    }

    // Kirim ke Gemini untuk dianalisis
    const messagesText = messages.slice(0, 100).map((m: any) => `- ${m.content}`).join('\n');
    const prompt = `Berikut adalah kumpulan pesan dari pengguna yang menghubungi support Epson:\n\n${messagesText}\n\nAnalisis dan identifikasi 5 masalah atau keluhan yang paling sering muncul. Kembalikan HANYA array JSON berisi 5 string singkat (maks 6 kata per item), tanpa penjelasan tambahan. Contoh: ["Printer tidak bisa mencetak", "Tinta cepat habis", "Driver tidak terdeteksi", "Kertas tersangkut", "Kualitas cetak buruk"]`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`[top-issues] Calling Gemini with model: ${GEMINI_MODEL}`);
    const geminiRes = await axios.post(geminiUrl, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
    }, { timeout: 20000 });

    const text = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    console.log(`[top-issues] Gemini raw response: ${text.substring(0, 200)}`);
    // Parse JSON dari response
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      const issues = JSON.parse(match[0]);
      const result = Array.isArray(issues) ? issues.slice(0, 5) : [];
      topIssuesCache[cacheKey] = { issues: result, cachedAt: Date.now() };
      res.json({ issues: result });
    } else {
      res.json({ issues: [] });
    }
  } catch (e: any) {
    console.error('❌ Top Issues Error:', e.message);
    // Fallback: pakai judul chat supaya tetap ada data meski Gemini rate limit
    try {
      let chatQuery2 = supabaseAdmin.from('chats').select('id, title');
      const month2 = req.query.month ? parseInt(req.query.month as string) : null;
      const year2 = req.query.year ? parseInt(req.query.year as string) : null;
      if (month2 && year2) {
        const startDate = new Date(year2, month2 - 1, 1).toISOString();
        const endDate = new Date(year2, month2, 0, 23, 59, 59).toISOString();
        chatQuery2 = chatQuery2.gte('created_at', startDate).lte('created_at', endDate);
      }
      const { data: fallbackChats } = await chatQuery2.limit(50);
      const issues = (fallbackChats || [])
        .map((c: any) => c.title)
        .filter(Boolean)
        .slice(0, 5);
      res.json({ issues, fromFallback: true });
    } catch {
      res.json({ issues: [] });
    }
  }
});

// ── GET /admin/chats ──────────────────────────────────────────
router.get('/chats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: chats, error } = await supabaseAdmin
      .from('chats')
      .select('id, customer_id, cs_id, title, preview, status, created_at, profiles:customer_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) { res.status(500).json({ error: 'Gagal mengambil daftar chat.' }); return; }
    const stats = {
      total: chats?.length || 0,
      ai: chats?.filter((c: any) => c.status === 'ai').length || 0,
      waiting_cs: chats?.filter((c: any) => c.status === 'waiting_cs').length || 0,
      with_cs: chats?.filter((c: any) => c.status === 'with_cs').length || 0,
      solved: chats?.filter((c: any) => c.status === 'solved').length || 0,
    };
    res.json({ chats: chats || [], stats });
  } catch (e: any) { res.status(500).json({ error: 'Terjadi kesalahan.' }); }
});

export default router;