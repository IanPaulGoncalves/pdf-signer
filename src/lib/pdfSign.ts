import { PDFDocument } from 'pdf-lib';
import type { SignaturePlacement } from '../types';

export async function signPdf(
  file: File,
  signatureDataUrl: string,
  placementOrPlacements: SignaturePlacement | SignaturePlacement[]
): Promise<Blob> {
  const fileBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBuffer);
  
  // Extract base64 data from data URL and determine format
  const [header, base64Data] = signatureDataUrl.split(',');
  const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
  
  // Embed the image (support both PNG and JPEG)
  let signatureImage;
  if (header.includes('image/jpeg') || header.includes('image/jpg')) {
    signatureImage = await pdfDoc.embedJpg(signatureBytes);
  } else {
    signatureImage = await pdfDoc.embedPng(signatureBytes);
  }

  const placements = Array.isArray(placementOrPlacements)
    ? placementOrPlacements
    : [placementOrPlacements];

  const pages = pdfDoc.getPages();

  for (const placement of placements) {
    const page = pages[placement.pageIndex];

    if (!page) {
      throw new Error(`Page ${placement.pageIndex} not found`);
    }

    const { width: pageWidth, height: pageHeight } = page.getSize();
    const { uiRect, viewportSize } = placement;

    const scaleX = pageWidth / viewportSize.width;
    const scaleY = pageHeight / viewportSize.height;

    const pdfX = uiRect.x * scaleX;
    const pdfWidth = uiRect.width * scaleX;
    const pdfHeight = uiRect.height * scaleY;
    const pdfY = pageHeight - (uiRect.y * scaleY) - pdfHeight;

    page.drawImage(signatureImage, {
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
    });
  }
  
  // Save and return as Blob
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
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
