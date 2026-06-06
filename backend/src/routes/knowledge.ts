// be/src/routes/knowledge.ts
import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js'; 
import { authenticateToken, requireRole } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Jalur (Path) menuju file CSV milik RAG Engine
const CSV_PATH = path.resolve(
  process.env.RAG_CSV_PATH ||
  path.join(process.cwd(), '..', 'epson-ai-chatbot', 'data', 'faq_dummy_data.csv')
);

/**
 * HELPER SINKRONISASI (Auto-Export Cache):
 * Mengambil seluruh data dari tabel Supabase menggunakan kolom 'pertanyaan' & 'jawaban'
 * lalu mengekspor ulang dokumen CSV secara bersih untuk RAG Python.
 */
async function syncDbToCSV(): Promise<void> {
  try {
    // 1. Tarik seluruh data FAQ terbaru dari database Supabase (Kolom Indonesia)
    const { data: items, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('pertanyaan, jawaban')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. Susun struktur teks CSV standar
    const header = 'pertanyaan,jawaban\n';
    const rows = (items || []).map(item => {
      const q = item.pertanyaan.includes(',') || item.pertanyaan.includes('"') || item.pertanyaan.includes('\n')
        ? `"${item.pertanyaan.replace(/"/g, '""')}"`
        : item.pertanyaan;
        
      const a = item.jawaban.includes(',') || item.jawaban.includes('"') || item.jawaban.includes('\n')
        ? `"${item.jawaban.replace(/"/g, '""')}"`
        : item.jawaban;
      return `${q},${a}`;
    });

    // 3. Tulis ulang berkas CSV secara utuh untuk konsumsi RAG Python
    fs.writeFileSync(CSV_PATH, header + rows.join('\n') + '\n', 'utf-8');
    console.log(`🔄 [Sync CSV] Sukses memperbarui cache CSV RAG dengan ${items?.length} data dari DB.`);
  } catch (err: any) {
    console.error('❌ [Sync CSV Error] Gagal menulis ulang dokumen CSV lokal:', err.message);
  }
}

/**
 * GET /knowledge
 * Mengambil seluruh data FAQ langsung dari tabel Supabase
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: items, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(items || []);
  } catch (error: any) {
    console.error('❌ Get Knowledge Error:', error.message);
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data.' });
  }
});

/**
 * POST /knowledge
 * Menambah data FAQ baru ke Supabase menggunakan kolom 'pertanyaan' & 'jawaban'
 */
router.post('/', authenticateToken, requireRole('admin'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, answer } = req.body; // Ambil properti dari body frontend
    if (!question || !answer) {
      res.status(400).json({ error: 'Pertanyaan dan jawaban tidak boleh kosong.' });
      return;
    }

    // 1. FIX: Masukkan data menggunakan nama kolom database yang BENAR (bahasa Indonesia)
    const { data: newItem, error: insertError } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        pertanyaan: question.trim(), // Menjodohkan ke kolom 'pertanyaan'
        jawaban: answer.trim(),     // Menjodohkan ke kolom 'jawaban'
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        res.status(409).json({ error: 'Pertanyaan ini sudah ada di knowledge base.' });
        return;
      }
      throw insertError;
    }

    console.log(`✅ Data berhasil disimpan ke DB dengan ID UUID: ${newItem.id}`);

    // 2. Jalankan sinkronisasi otomatis untuk memperbarui file CSV RAG
    await syncDbToCSV();

    res.status(201).json(newItem);
  } catch (error: any) {
    console.error('❌ Add Knowledge Error:', error.message);
    res.status(500).json({ error: 'Gagal menambah data ke database.' });
  }
});

/**
 * PUT /knowledge/:id
 * Mengedit FAQ di Supabase berdasarkan UUID target (Kolom Indonesia)
 */
router.put('/:id', authenticateToken, requireRole('admin'), async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { question, answer } = req.body;

    // 1. Jalankan kueri update data di Supabase menggunakan kolom bahasa Indonesia
    const { data: updatedItem, error: updateError } = await supabaseAdmin
      .from('knowledge_base')
      .update({
        pertanyaan: question?.trim(),
        jawaban: answer?.trim(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === '23505') {
        res.status(409).json({ error: 'Pertanyaan hasil edit sudah terdaftar di baris lain.' });
        return;
      }
      res.status(404).json({ error: 'Item tidak ditemukan atau gagal diperbarui.' });
      return;
    }

    console.log(`✅ Data sukses diperbarui di DB untuk ID: ${id}`);

    // 2. Jalankan sinkronisasi otomatis untuk memperbarui file CSV RAG
    await syncDbToCSV();

    res.json(updatedItem);
  } catch (error: any) {
    console.error('❌ Update Knowledge Error:', error.message);
    res.status(500).json({ error: 'Gagal mengupdate data.' });
  }
});

/**
 * DELETE /knowledge/:id
 */
router.delete('/:id', authenticateToken, requireRole('admin'), async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Eksekusi penghapusan baris data murni di Supabase menggunakan UUID
    const { error: deleteError, count } = await supabaseAdmin
      .from('knowledge_base')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (deleteError) throw deleteError;

    if (count === 0) {
      res.status(404).json({ error: 'Item tidak ditemukan di dalam database.' });
      return;
    }

    console.log(`🗑️ Data sukses dihapus dari DB untuk ID: ${id}`);

    // 2. Jalankan sinkronisasi otomatis untuk memperbarui file CSV RAG
    await syncDbToCSV();

    res.json({ message: 'Data berhasil dihapus dari database.' });
  } catch (error: any) {
    console.error('❌ Delete Knowledge Error:', error.message);
    res.status(500).json({ error: 'Gagal menghapus data akibat kendala sistem server.' });
  }
});

export default router;