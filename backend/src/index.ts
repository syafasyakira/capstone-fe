import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import escalationRoutes from './routes/escalation.js';
import csRoutes from './routes/cs.js';
import adminRoutes from './routes/admin.js';

// 1. Configuration
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

/**
 * 2. Middleware
 */
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req, express, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/**
 * 3. Routes
 */

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    rag_url: process.env.RAG_API_URL,
  });
});

// Auth endpoints (public)
app.use('/api/auth', authRoutes);

// Chat endpoints (protected)
app.use('/api/chat', chatRoutes);

// Escalation endpoints (protected)
app.use('/api/escalate', escalationRoutes);

// CS endpoints (protected - CS only)
app.use('/api/cs', csRoutes);

// Admin endpoints (protected - admin only)
app.use('/api/admin', adminRoutes);

/**
 * 4. Error handling middleware
 */
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled Error:', err.message);
  res.status(500).json({
    error: 'Terjadi kesalahan pada server.',
    message: err.message,
  });
});

// 5. 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

/**
 * 6. Start server
 */
app.listen(port, () => {
  console.log(`
  ==============================================
  🚀 EPSON Chatbot Backend - READY!
  ----------------------------------------------
  📡 URL        : http://localhost:${port}
  🔐 Auth       : JWT Token Based
  📦 Database   : Supabase
  🤖 AI Model   : RAG
  📍 RAG URL    : ${process.env.RAG_API_URL}
  ==============================================
  `);
});