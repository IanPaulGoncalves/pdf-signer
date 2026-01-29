import { useState, useEffect, useRef, useCallback } from 'react';
import { loadPdfDocument, renderPageToCanvas, type PDFDocumentProxy } from '@/lib/pdfRenderer';

interface UsePdfRendererOptions {
  file: File;
  scale?: number;
  onError?: (error: string) => void;
}

export const usePdfRenderer = ({ file, scale = 1.2, onError }: UsePdfRendererOptions) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const maxRetries = 3;
  
  // Reset error state
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  // Load PDF document with retry logic
  useEffect(() => {
    let isCanceled = false;
    
    const loadDoc = async () => {
      try {
        if (isCanceled) return;
        
        setIsLoading(true);
        setError(null);
        
        const doc = await loadPdfDocument(file);
        
        if (!isCanceled) {
          setPdfDoc(doc);
          setRetryCount(0);
        }
      } catch (err) {
        if (isCanceled) return;
        
        console.error('Erro ao carregar PDF:', err);
        const currentRetry = retryCount + 1;
        setRetryCount(currentRetry);
        
        if (currentRetry < maxRetries) {
          console.log(`Tentando novamente carregar PDF... (${currentRetry}/${maxRetries})`);
          setTimeout(() => {
            if (!isCanceled) {
              loadDoc();
            }
          }, 1000 * currentRetry); // Backoff exponencial
        } else {
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar PDF';
          const fullError = `Falha ao carregar PDF após ${maxRetries} tentativas: ${errorMessage}`;
          setError(fullError);
          onError?.(fullError);
          setIsLoading(false);
        }
      } finally {
        if (!isCanceled && (retryCount >= maxRetries || retryCount === 0)) {
          setIsLoading(false);
        }
      }
    };

    loadDoc();
    
    return () => {
      isCanceled = true;
    };
  }, [file, retryCount, onError]);

  // Render page with retry logic
  const renderPage = useCallback(async (
    pageIndex: number, 
    canvas: HTMLCanvasElement, 
    renderScale?: number
  ): Promise<{ width: number; height: number } | null> => {
    if (!pdfDoc || !canvas) return null;
    
    let pageRetryCount = 0;
    const maxPageRetries = 2;
    
    const attemptRender = async (): Promise<{ width: number; height: number }> => {
      try {
        return await renderPageToCanvas(pdfDoc, pageIndex, canvas, renderScale || scale);
      } catch (err) {
        pageRetryCount++;
        
        if (pageRetryCount < maxPageRetries) {
          console.log(`Tentando renderizar página novamente... (${pageRetryCount}/${maxPageRetries})`);
          await new Promise(resolve => setTimeout(resolve, 500 * pageRetryCount));
          return attemptRender();
        } else {
          throw err;
        }
      }
    };
    
    try {
      return await attemptRender();
    } catch (err) {
      console.error('Erro ao renderizar página:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      const fullError = `Erro ao renderizar página ${pageIndex + 1}: ${errorMessage}`;
      setError(fullError);
      onError?.(fullError);
      return null;
    }
  }, [pdfDoc, scale, onError]);

  // Retry loading the PDF
  const retry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setIsLoading(true);
    setPdfDoc(null);
  }, []);

  return {
    pdfDoc,
    isLoading,
    error,
    renderPage,
    clearError,
    retry,
    retryCount,
    maxRetries
  };
};