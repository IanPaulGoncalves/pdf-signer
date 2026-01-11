import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number }> {
  const page = await pdfDoc.getPage(pageIndex + 1); // pdf.js uses 1-based indexing
  const viewport = page.getViewport({ scale });
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context');
  }
  
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise;
  
  return { width: viewport.width, height: viewport.height };
}
