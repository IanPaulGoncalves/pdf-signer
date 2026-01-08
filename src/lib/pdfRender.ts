import { PDFDocument } from 'pdf-lib';

export async function getPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  return pdf.getPageCount();
}

export async function getPageDimensions(
  file: File,
  pageIndex: number
): Promise<{ width: number; height: number }> {
  const buffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buffer);
  const page = pdf.getPage(pageIndex);
  return page.getSize();
}
