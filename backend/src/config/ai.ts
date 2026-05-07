// backend/src/config/ai.ts
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/** * KONFIGURASI MODEL
 * Pastikan menggunakan model vision yang aktif (misal: llama-3.2-11b-vision-instant)
 */
const VISION_MODEL = "llama-3.2-11b-vision-instant"; 
const CHAT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_INSTRUCTION = `
Anda adalah EPSON AI Assistant yang ahli dalam produk printer dan proyektor Epson. 
Tugas Anda:
1. Memberikan solusi teknis yang ringkas dan praktis.
2. Gunakan bahasa Indonesia yang ramah dan profesional.
3. Jika user mengirimkan gambar printer yang rusak/terbuka, analisis masalahnya berdasarkan visual tersebut.
4. Jangan terlalu kaku jika ada objek lain di sekitar printer, selama itu produk Epson, berikan bantuan.
`;

/**
 * 1. Validasi Relevansi Gambar
 */
export const validateImageRelevance = async (imageBase64: string): Promise<boolean> => {
  try {
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [{
        role: "user",
        content: [
          { 
            type: "text", 
            text: "Is there a printer or electronic device in this image? Answer YA or TIDAK." 
          },
          { type: "image_url", image_url: { url: imageBase64 } }
        ]
      }],
      temperature: 0.5, 
      max_tokens: 5,
    });

    const result = completion.choices[0]?.message?.content?.toUpperCase() || "";
    return result.includes("YA");
  } catch (error: any) {
    console.error("❌ Vision Validation Error:", error.message);
    return true; 
  }
};

/**
 * 2. Fungsi Utama Chat/Summary (DIPERBAIKI)
 */
export const fetchGroqChat = async (messages: any[], mode: 'chat' | 'summary' = 'chat'): Promise<string> => {
  try {
    // 1. PEMBERSIHAN DATA (Crucial untuk Summary)
    // Jika mode 'summary', kita buang data Base64 agar tidak Error/Timeout
    const processedMessages = messages.map(m => {
      if (Array.isArray(m.content)) {
        // Ambil bagian teks saja dari konten yang berisi gambar
        const textContent = m.content.find((c: any) => c.type === 'text')?.text || "";
        return { ...m, content: textContent || "User mengirimkan gambar." };
      }
      return m;
    });

    // 2. Pilih Model & System Prompt
    // Gunakan model CHAT (teks murni) untuk summary agar lebih stabil dan cepat
    const model = (mode === 'summary') ? CHAT_MODEL : (messages.some(m => Array.isArray(m.content)) ? VISION_MODEL : CHAT_MODEL);

    const systemPrompt = mode === 'summary' 
      ? "Anda adalah asisten teknis Epson. Buatkan ringkasan singkat dalam bahasa Indonesia mengenai masalah yang dihadapi user dan solusi yang sudah diberikan dalam bentuk poin-poin. Jangan bertele-tele."
      : SYSTEM_INSTRUCTION;

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...processedMessages
    ];

    // 3. Request ke Groq
    const response = await groq.chat.completions.create({
      model: model,
      messages: finalMessages,
      temperature: mode === 'summary' ? 0.1 : 0.7, // Suhu rendah agar summary sangat akurat
      max_tokens: mode === 'summary' ? 500 : 1024,
      top_p: 1,
    });

    return response.choices[0]?.message?.content || "Maaf, ringkasan tidak dapat dibuat.";
  } catch (error: any) {
    console.error("❌ Groq API Error:", error.message);
    // Jika error "context_length_exceeded", itu karena gambar terlalu banyak di history
    if (error.message.includes("context_length")) {
        return "Percakapan terlalu panjang untuk diringkas sekaligus.";
    }
    throw new Error(`Gagal menghubungi Groq: ${error.message}`);
  }
};