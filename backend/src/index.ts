import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Pastikan ekstensi .js ada jika menggunakan NodeNext/ESM
import { fetchGroqChat, validateImageRelevance } from './config/ai.js'; 

// 1. Konfigurasi Environment
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

/**
 * 2. Middleware
 * Penting: limit 50mb wajib ada agar data Base64 gambar tidak ditolak (413 Payload Too Large)
 */
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

/**
 * 3. Endpoint Utama: Chat & Vision
 * Body: { message: string, imageUrl?: string, history?: any[] }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, imageUrl, history = [] } = req.body;

    // Validasi input minimal
    if (!message && !imageUrl) {
      return res.status(400).json({ error: 'Pesan atau gambar tidak boleh kosong' });
    }

    // A. Logika Validasi Gambar (Hanya jika ada imageUrl)
    if (imageUrl) {
      const isRelevant = await validateImageRelevance(imageUrl);
      
      if (!isRelevant) {
        return res.json({
          message: "Maaf, gambar ini tidak terlihat seperti printer atau produk Epson. Mohon unggah foto kendala printer Anda agar saya bisa menganalisisnya.",
          role: 'assistant',
          status: 'warning'
        });
      }
    }

    /**
     * B. Transformasi History
     * Memastikan pesan sebelumnya yang mengandung gambar diformat dengan benar 
     * agar tidak menyebabkan error di API Groq.
     */
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'bot' ? 'assistant' : msg.role,
      content: msg.content
    }));

    // C. Siapkan Konten Pesan Baru
    const currentContent = imageUrl 
      ? [
          { type: "text", text: message || "Analisis gambar ini." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      : message;

    const finalMessages = [
      ...formattedHistory,
      { role: 'user', content: currentContent }
    ];

    // D. Panggil Service AI (Groq SDK)
    const botReply = await fetchGroqChat(finalMessages, 'chat');

    // E. Kirim Respon Sukses
    res.json({
      message: botReply,
      role: 'assistant',
      status: 'success'
    });

  } catch (error: any) {
    console.error("❌ Groq Error:", error.message);
    
    // Penanganan error spesifik
    const statusCode = error.status || 500;
    const errorMessage = error.message.includes("API key") 
      ? "Konfigurasi API Key server bermasalah." 
      : "Terjadi kesalahan pada layanan AI.";

    res.status(statusCode).json({ 
      error: errorMessage,
      details: error.message 
    });
  }
});

/**
 * 4. Endpoint Tambahan: Summary
 */
app.post('/api/summary', async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || history.length === 0) {
      return res.status(400).json({ error: 'Riwayat percakapan kosong' });
    }

    const summary = await fetchGroqChat(history, 'summary');
    res.json({ message: summary, status: 'success' });
  } catch (error: any) {
    console.error("❌ Summary Error:", error);
    res.status(500).json({ error: 'Gagal membuat ringkasan.' });
  }
});

// 5. Jalankan Server
app.listen(port, () => {
  console.log(`
  ==============================================
  🚀 EPSON Backend System Ready!
  ----------------------------------------------
  📡 URL    : http://localhost:${port}
  🤖 Model  : ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}
  🖼️  Vision : llama-3.2-11b-vision-preview
  📦 Limit  : 50MB (Base64 Ready)
  ==============================================
  `);
});