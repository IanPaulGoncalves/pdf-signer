import JSZip from 'jszip';
import type { PdfDocument } from '../types';

export async function createZipFromDocuments(
  documents: PdfDocument[]
): Promise<Blob> {
  const zip = new JSZip();
  
  const signedDocs = documents.filter(doc => doc.status === 'signed' && doc.signedBlob);
  
  for (const doc of signedDocs) {
    if (doc.signedBlob) {
      // Add "_assinado" suffix before .pdf extension
      const signedName = doc.name.replace(/\.pdf$/i, '_assinado.pdf');
      zip.file(signedName, doc.signedBlob);
    }
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
