// backend/src/config/ai.ts
// RAG Model integration (Google Gemini + FastAPI)
// Replaces previous Groq implementation
import axios from 'axios';
import dotenv from 'dotenv';
import { RAGRequest, RAGResponse } from '../models/types.js';

dotenv.config();

const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:8000';
const RAG_ENDPOINT = process.env.RAG_API_ENDPOINT || '/epson/v1/ai-chatbot';

/**
 * Call RAG model API (FastAPI + Google Gemini)
 * 
 * Request Format:
 *   { user_id, message, history }
 * 
 * Response Format:
 *   { status: "success", reply: "...", tokens_used: 154 }
 *   
 * Note: Even if RAG cannot answer, response.status is still "success"
 *       but reply will contain error/out-of-scope message
 */
export const callRAGModel = async (
  userId: string,
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<RAGResponse> => {
  try {
    const request: RAGRequest = {
      user_id: userId,
      message,
      history,
    };

    const fullUrl = `${RAG_API_URL}${RAG_ENDPOINT}`;
    console.log(`\n📡 [RAG] Calling RAG Model API`);
    console.log(`   URL: ${fullUrl}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Message: "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);
    console.log(`   History length: ${history.length}`);

    const response = await axios.post<RAGResponse>(
      fullUrl,
      request,
      {
        timeout: 60000, // 60 second timeout for Gemini API
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;
    console.log(`✅ [RAG] Response received`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Reply: "${result.reply.substring(0, 60)}${result.reply.length > 60 ? '...' : ''}"`);
    console.log(`   Tokens: ${result.tokens_used || 0}`);

    // Validate response structure
    if (!result.status || !result.reply) {
      throw new Error('Invalid RAG response format: missing status or reply');
    }

    // Even if status is not "success", treat as valid response from RAG
    // (per user requirement: error message is still shown to customer)
    if (result.status !== 'success' && result.status !== 'error') {
      console.warn(`⚠️  [RAG] Unexpected status: ${result.status}`);
    }

    return {
      status: 'success', // Always return success to chat system
      reply: result.reply, // Error message from RAG is included here
      tokens_used: result.tokens_used || 0,
      needs_escalation: undefined, // Will be determined by shouldEscalate()
    };
  } catch (error: any) {
    console.error('\n❌ [RAG] API Call Error:', error.message);

    // Handle network errors - return error message that will be shown to customer
    if (error.code === 'ECONNREFUSED') {
      console.error('   → RAG API Server is not running');
      return {
        status: 'success',
        reply: '⚠️ Maaf, sistem sedang tidak tersedia. Silakan coba lagi dalam beberapa saat atau hubungi tim customer service kami.',
        tokens_used: 0,
        needs_escalation: true,
      };
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      console.error('   → RAG API Timeout or Network Issue');
      return {
        status: 'success',
        reply: '⚠️ Koneksi ke sistem AI sedang bermasalah. Tim customer service kami siap membantu Anda.',
        tokens_used: 0,
        needs_escalation: true,
      };
    }

    // Generic error
    console.error(`   → Error: ${error.message}`);
    return {
      status: 'success',
      reply: '⚠️ Terjadi kesalahan pada sistem. Silakan hubungi customer service kami untuk bantuan lebih lanjut.',
      tokens_used: 0,
      needs_escalation: true,
    };
  }
};

/**
 * Check if RAG response indicates escalation is needed
 * 
 * Escalation happens when:
 * 1. RAG explicitly flags needs_escalation: true
 * 2. Reply contains "outside scope" or "di luar ranah" indicators
 * 3. Reply contains error/inability to answer indicators
 * 4. Network error occurred (already returns needs_escalation: true)
 */
export const shouldEscalate = (ragResponse: RAGResponse): boolean => {
  // If explicitly flagged by RAG
  if (ragResponse.needs_escalation === true) {
    console.log('⚠️  [Escalation] Explicitly flagged by RAG');
    return true;
  }

  // Check for out-of-scope or error indicators in reply
  const replyLower = ragResponse.reply.toLowerCase();

  // Indicators that this should be escalated to CS
  const escalationIndicators = [
    // Out of scope indicators
    'diluar ranah',
    'di luar ranah',
    'outside scope',
    'outside of',
    'out of scope',

    // Inability indicators
    'tidak bisa menjawab',
    'tidak dapat menjawab',
    'cannot answer',
    'can\'t answer',
    'unable to answer',

    // System error indicators
    'sistem sedang tidak tersedia',
    'error',
    'gagal',
    'failed',

    // Generic "beyond scope" phrases
    'pertanyaan anda',
    'pertanyaanmu',
    'tidak termasuk',
    'bukan dalam',
  ];

  const isOutOfScope = escalationIndicators.some((indicator) => replyLower.includes(indicator));

  if (isOutOfScope) {
    console.log(`⚠️  [Escalation] Out-of-scope detected in reply`);
    return true;
  }

  // Check if reply starts with warning emoji or contains system error prefix
  if (replyLower.startsWith('⚠️') || replyLower.includes('maaf, sistem')) {
    console.log(`⚠️  [Escalation] System error or warning in reply`);
    return true;
  }

  return false;
};

/**
 * Process RAG response and determine next action
 * 
 * Returns:
 * {
 *   message: string (the reply from RAG),
 *   tokens_used: number,
 *   needs_escalation: boolean
 * }
 */
export const processRAGResponse = (ragResponse: RAGResponse) => {
  const needsEscalation = shouldEscalate(ragResponse);

  if (needsEscalation) {
    console.log('📊 [Process] Chat marked for escalation to CS');
  } else {
    console.log('✅ [Process] Chat handled by AI, no escalation needed');
  }

  return {
    message: ragResponse.reply,
    tokens_used: ragResponse.tokens_used || 0,
    needs_escalation: needsEscalation,
  };
};