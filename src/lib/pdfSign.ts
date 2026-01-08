import { PDFDocument } from 'pdf-lib';
import type { SignaturePlacement } from '../types';

export async function signPdf(
  file: File,
  signatureDataUrl: string,
  placement: SignaturePlacement
): Promise<Blob> {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer);
  
  // Extract base64 data from data URL
  const base64Data = signatureDataUrl.split(',')[1];
  const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Embed the PNG image
  const signatureImage = await pdfDoc.embedPng(signatureBytes);
  
  // Get the page
  const pages = pdfDoc.getPages();
  const page = pages[placement.pageIndex];
  
  if (!page) {
    throw new Error(`Page ${placement.pageIndex} not found`);
  }
  
  const { width: pageWidth, height: pageHeight } = page.getSize();
  
  // Convert UI coordinates to PDF coordinates
  // UI: origin top-left, PDF: origin bottom-left
  const { uiRect, viewportSize } = placement;
  
  const scaleX = pageWidth / viewportSize.width;
  const scaleY = pageHeight / viewportSize.height;
  
  const pdfX = uiRect.x * scaleX;
  const pdfWidth = uiRect.width * scaleX;
  const pdfHeight = uiRect.height * scaleY;
  
  // Convert Y: UI top-left to PDF bottom-left
  // In UI, y is distance from top. In PDF, y is distance from bottom.
  const pdfY = pageHeight - (uiRect.y + uiRect.height) * scaleY;
  
  // Draw the signature
  page.drawImage(signatureImage, {
    x: pdfX,
    y: pdfY,
    width: pdfWidth,
    height: pdfHeight,
  });
  
  // Save and return as Blob
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

export async function getPageDimensions(
  file: File,
  pageIndex: number
): Promise<{ width: number; height: number }> {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer);
  const page = pdfDoc.getPage(pageIndex);
  return page.getSize();
}
