import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure the worker - usando import direto do Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type PDFDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  console.log('🔄 pdfRenderer: Carregando documento PDF...', file.name);
  const arrayBuffer = await file.arrayBuffer();
  console.log('📦 pdfRenderer: ArrayBuffer obtido, tamanho:', arrayBuffer.byteLength);
  
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  console.log('⏳ pdfRenderer: Tarefa de carregamento criada');
  
  const doc = await loadingTask.promise;
  console.log('✅ pdfRenderer: Documento carregado com sucesso');
  return doc;
}

export async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.5
): Promise<{ width: number; height: number }> {
  console.log('🎨 pdfRenderer: Renderizando página...', { pageIndex: pageIndex + 1, scale });
  
  const page = await pdfDoc.getPage(pageIndex + 1); // pdf.js uses 1-based indexing
  console.log('📄 pdfRenderer: Página obtida');
  
  const viewport = page.getViewport({ scale });
  console.log('🖼️ pdfRenderer: Viewport calculado:', { width: viewport.width, height: viewport.height });
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  console.log('📐 pdfRenderer: Canvas redimensionado');
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2d context');
  }
  console.log('🖌️ pdfRenderer: Contexto 2D obtido');
  
  const renderTask = page.render({
    canvasContext: ctx,
    viewport: viewport,
  });
  
  await renderTask.promise;
  console.log('✅ pdfRenderer: Renderização concluída com sucesso');
  
  return { width: viewport.width, height: viewport.height };
}
