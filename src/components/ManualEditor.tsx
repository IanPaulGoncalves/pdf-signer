import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, ZoomIn, ZoomOut, Copy } from 'lucide-react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Button } from '@/components/ui/button';
import { loadPdfDocument, renderPageToCanvas, type PDFDocumentProxy } from '@/lib/pdfRenderer';
import type { PdfDocument, SignaturePlacement } from '@/types';

interface ManualEditorProps {
  document: PdfDocument;
  signature: string;
  onApply: (placement: SignaturePlacement) => void;
  onApplyToAll: (placement: SignaturePlacement) => void;
  onCancel: () => void;
}

export const ManualEditor: React.FC<ManualEditorProps> = ({
  document,
  signature,
  onApply,
  onApplyToAll,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(document.placement?.pageIndex ?? document.pageCount - 1);
  const [scale, setScale] = useState(1.2);
  const [viewportSize, setViewportSize] = useState({ width: 600, height: 800 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [signaturePos, setSignaturePos] = useState({ 
    x: document.placement?.uiRect.x ?? 100, 
    y: document.placement?.uiRect.y ?? 500 
  });
  const [signatureSize, setSignatureSize] = useState({ 
    width: document.placement?.uiRect.width ?? 200, 
    height: document.placement?.uiRect.height ?? 80 
  });
  const [isResizing, setIsResizing] = useState(false);

  // Load PDF document
  useEffect(() => {
    const loadDoc = async () => {
      try {
        console.log('🔄 Iniciando carregamento do PDF...', {
          fileName: document.file.name,
          fileSize: document.file.size,
          fileType: document.file.type
        });
        setIsLoading(true);
        setError(null);
        
        const doc = await loadPdfDocument(document.file);
        console.log('✅ PDF carregado com sucesso:', {
          numPages: doc.numPages,
          fingerprints: doc.fingerprints
        });
        setPdfDoc(doc);
      } catch (err) {
        console.error('❌ Erro ao carregar PDF:', err);
        setError(`Erro ao carregar o PDF: ${err.message || err}`);
      }
    };
    loadDoc();
  }, [document.file]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDoc || !canvasRef.current) {
        console.log('⏸️ Aguardando PDF ou canvas...', {
          pdfDoc: !!pdfDoc,
          canvas: !!canvasRef.current
        });
        return;
      }
      
      // Cancelar renderização anterior se existir
      if (renderTaskRef.current) {
        console.log('🛑 Cancelando renderização anterior');
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🎨 Iniciando renderização da página:', {
          pageIndex: currentPage,
          scale,
          canvasElement: canvasRef.current
        });
        
        const canvas = canvasRef.current;
        const page = await pdfDoc.getPage(currentPage + 1);
        const viewport = page.getViewport({ scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get 2d context');
        }
        
        // Limpar o canvas antes de renderizar
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Iniciar nova renderização e armazenar a tarefa
        renderTaskRef.current = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });
        
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
        
        console.log('✅ Página renderizada com sucesso:', { 
          width: viewport.width, 
          height: viewport.height 
        });
        
        setViewportSize({ width: viewport.width, height: viewport.height });
        
        // Ensure signature stays within bounds (apenas se necessário)
        setSignaturePos(prev => {
          const newX = Math.min(prev.x, Math.max(0, viewport.width - signatureSize.width));
          const newY = Math.min(prev.y, Math.max(0, viewport.height - signatureSize.height));
          
          // Só atualizar se realmente mudou
          if (newX !== prev.x || newY !== prev.y) {
            return { x: newX, y: newY };
          }
          return prev;
        });
      } catch (err: any) {
        if (err.name === 'RenderingCancelledException') {
          console.log('⚠️ Renderização cancelada (esperado)');
          return;
        }
        console.error('❌ Erro ao renderizar página:', err);
        setError(`Erro ao renderizar página: ${err.message || err}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    renderPage();
    
    // Cleanup: cancelar renderização ao desmontar ou antes de nova renderização
    return () => {
      if (renderTaskRef.current) {
        console.log('🧹 Limpeza: cancelando renderização');
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale]); // Removido signatureSize das dependências

  const handleDrag = useCallback((_e: DraggableEvent, data: DraggableData) => {
    setSignaturePos({ x: data.x, y: data.y });
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = signatureSize.width;
    const startHeight = signatureSize.height;
    const aspectRatio = startWidth / startHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, Math.min(viewportSize.width - signaturePos.x, startWidth + deltaX));
      const newHeight = newWidth / aspectRatio;
      
      // Garantir que a assinatura não saia dos limites
      const maxHeight = viewportSize.height - signaturePos.y;
      if (newHeight <= maxHeight) {
        setSignatureSize({ width: newWidth, height: newHeight });
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [signatureSize, viewportSize, signaturePos]);

  const handleApply = useCallback(() => {
    const placement: SignaturePlacement = {
      pageIndex: currentPage,
      uiRect: { 
        x: signaturePos.x, 
        y: signaturePos.y, 
        width: signatureSize.width, 
        height: signatureSize.height 
      },
      viewportSize,
    };
    onApply(placement);
  }, [currentPage, signaturePos, signatureSize, viewportSize, onApply]);

  const handleApplyToAll = useCallback(() => {
    const placement: SignaturePlacement = {
      pageIndex: currentPage,
      uiRect: { 
        x: signaturePos.x, 
        y: signaturePos.y, 
        width: signatureSize.width, 
        height: signatureSize.height 
      },
      viewportSize,
    };
    onApplyToAll(placement);
  }, [currentPage, signaturePos, signatureSize, viewportSize, onApplyToAll]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Editor Manual</h2>
          <p className="text-sm text-muted-foreground">{document.name}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(2.5, s + 0.2))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="outline" onClick={handleApplyToAll}>
            <Copy className="w-4 h-4 mr-2" />Aplicar a todos
          </Button>
          <Button onClick={handleApply}>
            <Check className="w-4 h-4 mr-2" />Aplicar
          </Button>
        </div>
      </div>
      
      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto p-8 flex items-start justify-center bg-muted/50">
        <div className="relative shadow-2xl rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-card z-10">
              <p className="text-destructive">{error}</p>
            </div>
          )}
          
          <canvas ref={canvasRef} className="block" />
          
          {!isLoading && !error && (
            <Draggable 
              nodeRef={nodeRef} 
              position={signaturePos} 
              onDrag={handleDrag} 
              bounds="parent" 
              disabled={isResizing}
            >
              <div 
                ref={nodeRef} 
                className="absolute border-2 border-primary rounded cursor-move bg-white/90 shadow-lg"
                style={{ 
                  width: signatureSize.width, 
                  height: signatureSize.height,
                  top: 0,
                  left: 0,
                }}
              >
                <img 
                  src={signature} 
                  alt="Assinatura" 
                  className="w-full h-full object-contain pointer-events-none p-1" 
                  draggable={false} 
                />
                <div 
                  className="absolute w-5 h-5 bg-primary rounded-full cursor-se-resize flex items-center justify-center shadow-md hover:scale-110 transition-transform" 
                  style={{ right: -10, bottom: -10 }} 
                  onMouseDown={handleResizeStart}
                >
                  <div className="w-2 h-2 border-r-2 border-b-2 border-primary-foreground" />
                </div>
              </div>
            </Draggable>
          )}
        </div>
      </div>
      
      {/* Footer - Page navigation */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-border bg-card">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setCurrentPage(p => Math.max(0, p - 1))} 
          disabled={currentPage === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-foreground min-w-32 text-center">
          Página {currentPage + 1} de {document.pageCount}
        </span>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setCurrentPage(p => Math.min(document.pageCount - 1, p + 1))} 
          disabled={currentPage === document.pageCount - 1}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
