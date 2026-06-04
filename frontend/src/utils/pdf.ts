import { ChatMessage } from '@/types';

// Tambahkan parameter ekstra agar PDF lebih kaya informasi
export async function downloadChatSummaryPDF(
  messages: ChatMessage[],
  sessionTitle: string,
  metadata?: {
    status: string;
    csName: string | null;
    aiSummary?: string; // Ringkasan singkat dari AI
  }
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // --- 1. HEADER (Epson Style) ---
  doc.setFillColor(0, 48, 135);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EPSON Support', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Catatan Resolusi Bantuan AI & CS', margin, 28);

  y = 55;
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const splitTitle = doc.splitTextToSize(sessionTitle, pageWidth - margin * 2);
  doc.text(splitTitle, margin, y);
  y += (splitTitle.length * 6) + 2;

  // --- 2. METADATA TIKET ---
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 120);
  
  const printDate = new Date().toLocaleString('id-ID');
  const statusLabel = metadata?.status === 'solved' ? 'Terselesaikan' : 'Belum Selesai';
  const handlerLabel = metadata?.csName ? `Ditangani oleh: CS ${metadata.csName}` : 'Ditangani oleh: AI Assistant';

  doc.text(`Dicetak pada: ${printDate}`, margin, y);
  doc.text(`Status: ${statusLabel}  |  ${handlerLabel}`, margin, y + 5);
  y += 12;

  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- 3. RINGKASAN MASALAH (EXECUTIVE SUMMARY) ---
  if (metadata?.aiSummary) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 48, 135);
    doc.text('Ringkasan Otomatis:', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(60, 60, 80);
    const summaryLines = doc.splitTextToSize(metadata.aiSummary, pageWidth - margin * 2);
    doc.text(summaryLines, margin, y);
    y += (summaryLines.length * 6) + 10;
  }

  // --- 4. TRANSKRIP PERCAKAPAN ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 60);
  doc.text('Log Transkrip Percakapan:', margin, y);
  y += 8;

  for (const msg of messages) {
    // Hindari text terpotong di akhir halaman
    if (y > 270) { doc.addPage(); y = 20; }

    const isBot = msg.role === 'bot';
    const isCS = msg.role === 'cs';
    const label = isBot ? 'EPSON AI' : isCS ? `CS ${metadata?.csName || ''}` : 'Pelanggan';
    const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    if (isBot || isCS) doc.setTextColor(0, 71, 187); // Biru Epson
    else doc.setTextColor(22, 163, 74); // Hijau untuk User

    doc.text(`${label} · ${time}`, margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 60);
    doc.setFontSize(10);
    
    // Hapus format markdown tebal ** jika ada
    const cleanContent = msg.content.replace(/\*\*(.*?)\*\*/g, '$1');
    const lines = doc.splitTextToSize(cleanContent, pageWidth - margin * 2);
    
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 5;
    }
    y += 4; // Spasi antar pesan
  }

  doc.save(`epson-support-${sessionTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.pdf`);
}

// Tambahkan parameter insight untuk laporan bulanan
export async function downloadMonthlyReportPDF(month: string, data: {
  totalIssues: number;
  solved: number;
  pending: number;
  topIssues: string[];
  insights?: string; // Analisa otomatis
}): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // --- 1. HEADER ---
  doc.setFillColor(0, 48, 135);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EPSON Support', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Laporan Kinerja Bulanan – ${month}`, margin, 28);

  y = 55;
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ikhtisar Data: ${month}`, margin, y);
  y += 12;

  // --- 2. STATS (Diperbaiki Layout Horizontal-nya) ---
  const solvedRate = data.totalIssues > 0 ? Math.round((data.solved / data.totalIssues) * 100) : 0;
  
  const stats = [
    { label: 'Total Keluhan', value: data.totalIssues, color: [0, 71, 187] as [number,number,number] },
    { label: `Terselesaikan (${solvedRate}%)`, value: data.solved, color: [22, 163, 74] as [number,number,number] },
    { label: 'Pending', value: data.pending, color: [234, 88, 12] as [number,number,number] },
  ];

  let currentX = margin;
  for (const stat of stats) {
    doc.setFillColor(...stat.color);
    doc.roundedRect(currentX, y, 50, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    
    // Value Tengah
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value), currentX + 8, y + 14);
    
    // Label Bawah
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, currentX + 8, y + 20);
    
    currentX += 55; // Geser ke kanan untuk kotak selanjutnya (Bug Fixed!)
  }

  y += 35;
  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // --- 3. ANALISA / KESIMPULAN (Jika ada) ---
  if (data.insights) {
    doc.setTextColor(30, 30, 60);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Catatan & Rekomendasi Eksekutif', margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    const insightLines = doc.splitTextToSize(data.insights, pageWidth - margin * 2);
    doc.text(insightLines, margin, y);
    y += (insightLines.length * 6) + 10;
  }

  // --- 4. DAFTAR MASALAH TERATAS ---
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 5 Permasalahan Terbanyak', margin, y);
  y += 8;

  data.topIssues.forEach((issue, i) => {
    // Kotak angka list
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin, y - 4, 6, 6, 1, 1, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 48, 135);
    doc.text(`${i + 1}`, margin + 1.5, y + 0.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    doc.text(issue, margin + 10, y + 0.5);
    y += 9;
  });

  doc.save(`epson-laporan-${month.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}