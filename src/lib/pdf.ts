import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { jsPDF } from 'jspdf';
import type { Job } from '../types';

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'job-report';
}

export function createJobPdf(job: Job): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const margin = 16;
  const width = 210 - margin * 2;
  let y = 18;

  const ensureSpace = (needed: number) => {
    if (y + needed <= 282) return;
    doc.addPage();
    y = 18;
  };
  const write = (text: string, size = 10, color: [number, number, number] = [38, 43, 56], gap = 5) => {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || '—', width) as string[];
    ensureSpace(lines.length * gap + 3);
    doc.text(lines, margin, y);
    y += lines.length * gap;
  };

  doc.setFillColor(11, 14, 21);
  doc.rect(0, 0, 210, 38, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('WATTTOOL', margin, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(185, 191, 207);
  doc.text('Smart tools for the trade · verify all figures before use', margin, 25);
  y = 49;

  doc.setFont('helvetica', 'bold');
  write(job.name, 18, [18, 22, 34], 7);
  doc.setFont('helvetica', 'normal');
  write([job.customer, job.address].filter(Boolean).join(' · ') || 'No customer or site recorded', 10, [92, 101, 124]);
  write(`Reference: ${job.reference || '—'}   Date: ${job.date || '—'}`, 10, [92, 101, 124]);
  y += 4;

  job.entries.forEach((entry, index) => {
    ensureSpace(40);
    doc.setDrawColor(224, 226, 235);
    doc.line(margin, y, 210 - margin, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    write(`${index + 1}. ${entry.title}`, 13, [74, 35, 170], 6);
    write(entry.result.headline, 17, [18, 22, 34], 7);
    doc.setFont('helvetica', 'normal');
    write(entry.result.summary, 10, [92, 101, 124]);
    entry.result.rows.forEach((row) => write(`${row.label}: ${row.value}`, 10));
    if (entry.result.warning) write(`Important: ${entry.result.warning}`, 9, [161, 80, 20]);
    write(`Recorded ${new Date(entry.createdAt).toLocaleString('en-GB')}`, 8, [116, 124, 145]);
    y += 3;
  });

  if (job.notes.trim()) {
    ensureSpace(25);
    doc.setFont('helvetica', 'bold');
    write('Job notes', 13, [18, 22, 34], 6);
    doc.setFont('helvetica', 'normal');
    write(job.notes, 10);
  }

  if ((job.photos ?? []).length) {
    ensureSpace(58);
    doc.setFont('helvetica', 'bold');
    write('Site photos', 13, [18, 22, 34], 6);
    const thumbWidth = 54;
    const thumbHeight = 40;
    job.photos!.slice(0, 6).forEach((photo, index) => {
      const column = index % 3;
      if (column === 0 && index > 0) { y += thumbHeight + 7; ensureSpace(thumbHeight + 7); }
      try { doc.addImage(photo.src, 'JPEG', margin + column * (thumbWidth + 7), y, thumbWidth, thumbHeight, undefined, 'FAST'); } catch { /* Keep the report usable if a photo cannot be decoded. */ }
    });
    y += thumbHeight + 9;
  }

  if (job.signedBy) {
    ensureSpace(34);
    doc.setFont('helvetica', 'bold');
    write('Record signature', 12, [18, 22, 34], 6);
    if (job.signatureDataUrl) {
      try { doc.addImage(job.signatureDataUrl, 'PNG', margin, y, 48, 18, undefined, 'FAST'); y += 20; } catch { /* Keep the typed signature details. */ }
    }
    doc.setFont('helvetica', 'normal');
    write(`Signed by ${job.signedBy} on ${job.signedDate || job.date}`, 9, [74, 82, 100]);
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(116, 124, 145);
    doc.text(`WATTtool · Page ${page} of ${pages}`, margin, 291);
    doc.text('Indicative calculation record — not an electrical certificate', 210 - margin, 291, { align: 'right' });
  }

  return doc.output('blob');
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveOrSharePdf(job: Job): Promise<void> {
  const blob = createJobPdf(job);
  const filename = `${safeFilename(job.name)}-${job.date || 'report'}.pdf`;
  if (Capacitor.isNativePlatform()) {
    const saved = await Filesystem.writeFile({
      path: `WATTtool/${filename}`,
      data: await blobToBase64(blob),
      directory: Directory.Documents,
      recursive: true,
    });
    await Share.share({ title: job.name, text: 'WATTtool calculation record', url: saved.uri, dialogTitle: 'Save or share PDF' });
    return;
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
