// Chat routes: Main chat interface with RAG and escalation
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { callRAGModel, processRAGResponse } from '../config/ai.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { ChatRequest, Chat, Message } from '../models/types.js';

const router = Router();

// Middleware
router.use(authenticateToken);

/**
 * POST /chat
 * Send message to chat (creates new chat if needed)
 * Body: { message, image_url?, chat_id? }
 */
router.post('/', async (req: Request<{}, {}, ChatRequest>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { message, image_url, chat_id } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
      return;
    }

    console.log(`💬 New message from user ${userId}: ${message.substring(0, 50)}...`);

    let currentChatId: string;

    // 1. Get or create chat
    if (chat_id) {
      // Verify chat ownership
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

      currentChatId = chat_id;
    } else {
      // Create new chat
      const { data: newChat, error: createError } = await supabaseAdmin
        .from('chats')
        .insert({
          customer_id: userId,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          preview: message.substring(0, 100),
          status: 'ai', // Will change to 'waiting_cs' if escalated
        })
        .select()
        .single();

      if (createError || !newChat) {
        console.error('❌ Chat Creation Error:', createError?.message);
        res.status(500).json({ error: 'Gagal membuat chat baru.' });
        return;
      }

      currentChatId = newChat.id;
      console.log(`✅ New chat created: ${currentChatId}`);
    }

    // 2. Get chat history for RAG context
    const { data: messageHistory, error: historyError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('❌ History Fetch Error:', historyError.message);
    }

    // Format history for RAG
    const formattedHistory = (messageHistory || []).map((msg: Message) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }));

    // 3. Save user message to DB
    const { error: userMsgError } = await supabaseAdmin.from('messages').insert({
      chat_id: currentChatId,
      sender_id: userId,
      role: 'user',
      content: message,
      image_url: image_url || null,
    });

    if (userMsgError) {
      console.error('❌ User Message Save Error:', userMsgError.message);
    }

    // 4. Call RAG model
    console.log(`📡 Calling RAG model...`);
    const ragResponse = await callRAGModel(userId, message, formattedHistory);
    const processed = processRAGResponse(ragResponse);

    // 5. Handle escalation
    let chatStatus = 'ai';
    if (processed.needs_escalation) {
      chatStatus = 'waiting_cs';
      console.log('⚠️  Message requires escalation to CS');
    }

    // 6. Save AI/Assistant response to DB
    const { error: assistantMsgError } = await supabaseAdmin.from('messages').insert({
      chat_id: currentChatId,
      sender_id: userId,
      role: processed.needs_escalation ? 'assistant' : 'assistant',
      content: processed.message,
    });

    if (assistantMsgError) {
      console.error('❌ Assistant Message Save Error:', assistantMsgError.message);
    }

    // 7. Update chat status if escalated
    if (processed.needs_escalation) {
      const { error: statusError } = await supabaseAdmin
        .from('chats')
        .update({
          status: chatStatus,
          preview: processed.message.substring(0, 100),
        })
        .eq('id', currentChatId);

      if (statusError) {
        console.error('❌ Chat Status Update Error:', statusError.message);
      }
    }

    console.log(`✅ Response sent. Status: ${chatStatus}`);

    // 8. Send response to client
    res.json({
      chat_id: currentChatId,
      message: processed.message,
      status: chatStatus,
      needs_escalation: processed.needs_escalation,
      tokens_used: processed.tokens_used,
    });
  } catch (error: any) {
    console.error('❌ Chat Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses chat.' });
  }
});

/**
 * GET /chat/:chatId
 * Get chat history with messages
 */
router.get('/:chatId', async (req: Request<{ chatId: string }, {}, {}>, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;
    const { chatId } = req.params;

    // Verify ownership
    const { data: chat, error: chatError } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('customer_id', userId)
      .single();

    if (chatError || !chat) {
      res.status(404).json({ error: 'Chat tidak ditemukan.' });
      return;
    }

    // Get all messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('messages')
      .select('*')
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
    console.error('❌ Get Chat Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

/**
 * GET /chat
 * List all chats for current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.sub;

    const { data: chats, error } = await supabaseAdmin
      .from('chats')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Chats Fetch Error:', error.message);
      res.status(500).json({ error: 'Gagal mengambil daftar chat.' });
      return;
    }

    res.json({
      chats: chats || [],
    });
  } catch (error: any) {
    console.error('❌ List Chats Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan.' });
  }
});

export default router;
