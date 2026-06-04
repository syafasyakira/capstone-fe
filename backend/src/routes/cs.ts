// Customer Service routes: Handle escalated chats
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { ChatRequest } from '../models/types.js';

const router = Router();

// Middleware: Only CS and Admin can access
router.use(authenticateToken);
router.use(requireRole('customer_service', 'admin'));

/**
 * GET /cs/chats
 * Get all escalated chats assigned to current CS or all (for admin)
 */
router.get('/chats', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const userRole = req.user!.role;

    let query = supabaseAdmin
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
      .in('status', ['waiting_cs', 'with_cs']);

    // CS sees only assigned chats
    if (userRole === 'customer_service') {
      query = query.or(`cs_id.eq.${userId},cs_id.is.null`); // Unassigned or assigned to them
    }
    // Admin sees all

    const { data: chats, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ CS Chats Fetch Error:', error.message);
      res.status(500).json({ error: 'Gagal mengambil daftar chat.' });
      return;
    }

    res.json({
      chats: chats || [],
      count: chats?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ Get CS Chats Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * GET /cs/chats/:chatId
 * Get escalated chat with full message history
 */
router.get('/chats/:chatId', async (req: Request<{ chatId: string }, {}, {}>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chatId } = req.params;

    // Get chat
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .in('status', ['waiting_cs', 'with_cs'])
      .single();

    if (chatError || !chat) {
      res.status(404).json({ error: 'Chat tidak ditemukan.' });
      return;
    }

    // Assign to CS if unassigned
    if (!chat.cs_id) {
      await supabaseAdmin
        .from('chats')
        .update({
          cs_id: userId,
          status: 'with_cs',
        })
        .eq('id', chatId);

      console.log(`✅ Chat assigned to CS: ${userId}`);
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select(
        `
        id,
        chat_id,
        sender_id,
        role,
        content,
        image_url,
        created_at,
        profiles:sender_id (
          id,
          full_name,
          email,
          role
        )
      `
      )
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ Messages Fetch Error:', messagesError.message);
      res.status(500).json({ error: 'Gagal mengambil pesan.' });
      return;
    }

    res.json({
      chat,
      messages: messages || [],
    });
  } catch (error: any) {
    console.error('❌ Get CS Chat Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * POST /cs/chats/:chatId/message
 * CS sends message to customer
 * Body: { message }
 */
router.post(
  '/chats/:chatId/message',
  async (req: Request<{ chatId: string }, {}, ChatRequest>, res: Response): Promise<void> => {
    try {
      const userId = req.user!.sub;
      const { chatId } = req.params;
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
        return;
      }

      console.log(`💬 CS ${userId} sending message to chat ${chatId}`);

      // Verify chat is assigned or being handled
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .in('status', ['waiting_cs', 'with_cs'])
        .single();

      if (chatError || !chat) {
        res.status(404).json({ error: 'Chat tidak ditemukan.' });
        return;
      }

      // Ensure CS is assigned
      if (chat.cs_id && chat.cs_id !== userId) {
        res.status(403).json({ error: 'Chat ini sedang ditangani oleh CS lain.' });
        return;
      }

      // Save CS message
      const { data: savedMsg, error: saveError } = await supabaseAdmin
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: userId,
          role: 'cs',
          content: message,
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ CS Message Save Error:', saveError.message);
        res.status(500).json({ error: 'Gagal mengirim pesan.' });
        return;
      }

      // Update chat status to 'with_cs' and update preview
      await supabaseAdmin
        .from('chats')
        .update({
          status: 'with_cs',
          cs_id: userId,
          preview: message.substring(0, 100),
        })
        .eq('id', chatId);

      console.log(`✅ CS message sent to chat ${chatId}`);

      res.json({
        message: 'Pesan berhasil dikirim.',
        data: savedMsg,
      });
    } catch (error: any) {
      console.error('❌ Send CS Message Error:', error.message);
      res.status(500).json({ error: 'Terjadi kesalahan saat mengirim pesan.' });
    }
  }
);

/**
 * PATCH /cs/chats/:chatId/status
 * Update chat status (e.g., mark as solved)
 * Body: { status: 'solved' | 'waiting_cs' | 'with_cs' }
 */
router.patch(
  '/chats/:chatId/status',
  async (req: Request<{ chatId: string }, {}, { status: string }>, res: Response): Promise<void> => {
    try {
      const userId = req.user!.sub;
      const { chatId } = req.params;
      const { status } = req.body;

      if (!['solved', 'waiting_cs', 'with_cs'].includes(status)) {
        res.status(400).json({ error: 'Status tidak valid.' });
        return;
      }

      const { error } = await supabaseAdmin
        .from('chats')
        .update({ status })
        .eq('id', chatId)
        .eq('cs_id', userId); // Only assigned CS can update

      if (error) {
        console.error('❌ Chat Status Update Error:', error.message);
        res.status(500).json({ error: 'Gagal mengupdate status.' });
        return;
      }

      console.log(`✅ Chat status updated to: ${status}`);

      res.json({
        message: 'Status berhasil diupdate.',
        chat_id: chatId,
        status,
      });
    } catch (error: any) {
      console.error('❌ Update Chat Status Error:', error.message);
      res.status(500).json({ error: 'Terjadi kesalahan.' });
    }
  }
);

export default router;
