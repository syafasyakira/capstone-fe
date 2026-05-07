import { ChatMessage } from '@/types';

export async function downloadChatSummaryPDF(
  messages: ChatMessage[],
  sessionTitle: string
): Promise<void> {
  // Dynamically import jsPDF to avoid SSR issues
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFillColor(0, 48, 135);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EPSON Support', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI Helpdesk Assistant – Ringkasan Percakapan', margin, 28);

  y = 55;
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(sessionTitle, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 120);
  doc.text(`Dibuat pada: ${new Date().toLocaleString('id-ID')}`, margin, y);
  y += 12;

  // Divider
  doc.setDrawColor(200, 210, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Messages
  for (const msg of messages) {
    const isBot = msg.role === 'bot';
    const label = isBot ? 'EPSON AI Assistant' : 'Anda';
    const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isBot ? 0 : 0, isBot ? 48 : 71, isBot ? 135 : 187);
    doc.text(`${label} · ${time}`, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 60);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(msg.content, pageWidth - margin * 2);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, margin, y);
      y += 6;
    }
    y += 6;
  }

  doc.save(`epson-support-${sessionTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

export async function downloadMonthlyReportPDF(month: string, data: {
  totalIssues: number;
  solved: number;
  pending: number;
  topIssues: string[];
}): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header
  doc.setFillColor(0, 48, 135);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('EPSON Support', margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Laporan Bulanan – ${month}`, margin, 28);

  y = 55;
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Ringkasan Laporan: ${month}`, margin, y);
  y += 14;

  // Stats
  const stats = [
    { label: 'Total Issues', value: data.totalIssues, color: [0, 71, 187] as [number,number,number] },
    { label: 'Terselesaikan', value: data.solved, color: [22, 163, 74] as [number,number,number] },
    { label: 'Pending', value: data.pending, color: [234, 88, 12] as [number,number,number] },
  ];

  for (const stat of stats) {
    doc.setFillColor(...stat.color);
    doc.roundedRect(margin, y, 50, 22, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(String(stat.value), margin + 8, y + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(stat.label, margin + 8, y + 20);
    margin && (y += 0);
  }

  y += 40;
  doc.setTextColor(30, 30, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Masalah', margin, y);
  y += 8;

  data.topIssues.forEach((issue, i) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 80);
    doc.text(`${i + 1}. ${issue}`, margin + 4, y);
    y += 7;
  });

  doc.save(`epson-laporan-${month.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}
