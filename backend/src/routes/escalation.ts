// Escalation routes: Handle chat escalation to Customer Service
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { EscalationRequest } from '../models/types.js';

const router = Router();

// Middleware
router.use(authenticateToken);

/**
 * POST /escalate
 * Customer escalates chat to CS
 * Body: { chat_id, reason? }
 */
router.post('/', async (req: Request<{}, {}, EscalationRequest>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chat_id, reason } = req.body;

    if (!chat_id) {
      res.status(400).json({ error: 'Chat ID harus diisi.' });
      return;
    }

    console.log(`⚠️  Escalation requested for chat: ${chat_id} by user: ${userId}`);

    // Verify chat ownership and get current status
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', chat_id)
      .eq('customer_id', userId)
      .single();

    if (chatError || !chat) {
      res.status(404).json({ error: 'Chat tidak ditemukan.' });
      return;
    }

    // Update chat status to waiting_cs
    const { error: updateError } = await supabaseAdmin
      .from('chats')
      .update({
        status: 'waiting_cs',
        preview: reason || 'Percakapan dialihkan ke CS',
      })
      .eq('id', chat_id);

    if (updateError) {
      console.error('❌ Escalation Update Error:', updateError.message);
      res.status(500).json({ error: 'Gagal mengalihkan chat.' });
      return;
    }

    // Save escalation message
    const escalationMsg = reason
      ? `Percakapan anda sedang diteruskan ke Customer Service kami, mohon tunggu untuk beberapa saat... Alasan: ${reason}`
      : 'Percakapan anda sedang diteruskan ke Customer Service kami, mohon tunggu untuk beberapa saat...';

    await supabaseAdmin.from('messages').insert({
      chat_id,
      sender_id: userId,
      role: 'user',
      content: escalationMsg,
    });

    console.log(`✅ Chat escalated to CS: ${chat_id}`);

    res.json({
      message: 'Chat berhasil dialihkan ke customer service.',
      chat_id,
      status: 'waiting_cs',
    });
  } catch (error: any) {
    console.error('❌ Escalation Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengalihkan chat.' });
  }
});

/**
 * GET /escalate/pending
 * Get list of pending escalations (Admin/CS only)
 */
router.get(
  '/pending',
  requireRole('customer_service', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { data: pendingChats, error } = await supabaseAdmin
        .from('chats')
        .select(
          `
          id,
          customer_id,
          cs_id,
          title,
          preview,
          status,
          created_at,
          profiles:customer_id (
            id,
            full_name,
            email
          )
        `
        )
        .eq('status', 'waiting_cs')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Pending Chats Fetch Error:', error.message);
        res.status(500).json({ error: 'Gagal mengambil daftar chat menunggu.' });
        return;
      }

      res.json({
        pending_chats: pendingChats || [],
        count: pendingChats?.length || 0,
      });
    } catch (error: any) {
      console.error('❌ Get Pending Chats Error:', error.message);
      res.status(500).json({ error: 'Terjadi kesalahan.' });
    }
  }
);

export default router;
