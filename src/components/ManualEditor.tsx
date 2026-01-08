import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check, ZoomIn, ZoomOut, Copy } from 'lucide-react';
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable';
import { Button } from '@/components/ui/button';
import { PDFDocument } from 'pdf-lib';
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
  
  const [currentPage, setCurrentPage] = useState(document.placement?.pageIndex || document.pageCount - 1);
  const [scale, setScale] = useState(1.0);
  const [viewportSize, setViewportSize] = useState({ width: 600, height: 800 });
  const [isLoading, setIsLoading] = useState(true);
  
  const [signaturePos, setSignaturePos] = useState({ x: 100, y: 500 });
  const [signatureSize, setSignatureSize] = useState({ width: 200, height: 80 });
  const [isResizing, setIsResizing] = useState(false);

  // Render PDF page using pdf-lib preview
  useEffect(() => {
    const loadPage = async () => {
      if (!canvasRef.current) return;
      setIsLoading(true);
      
      try {
        const buffer = await document.file.arrayBuffer();
        const pdf = await PDFDocument.load(buffer);
        const page = pdf.getPage(currentPage);
        const { width, height } = page.getSize();
        
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;
        
        canvasRef.current.width = scaledWidth;
        canvasRef.current.height = scaledHeight;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, scaledWidth, scaledHeight);
          ctx.strokeStyle = '#e0e0e0';
          ctx.strokeRect(0, 0, scaledWidth, scaledHeight);
          
          // Draw page info
          ctx.fillStyle = '#666';
          ctx.font = '14px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Página ${currentPage + 1} de ${document.pageCount}`, scaledWidth / 2, 30);
          ctx.fillText(`${Math.round(width)} × ${Math.round(height)} pts`, scaledWidth / 2, 50);
          ctx.fillText('Posicione a assinatura abaixo', scaledWidth / 2, scaledHeight / 2);
        }
        
        setViewportSize({ width: scaledWidth, height: scaledHeight });
      } catch (error) {
        console.error('Error loading page:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPage();
  }, [document.file, document.pageCount, currentPage, scale]);

  useEffect(() => {
    if (document.placement) {
      setSignaturePos({ x: document.placement.uiRect.x, y: document.placement.uiRect.y });
      setSignatureSize({ width: document.placement.uiRect.width, height: document.placement.uiRect.height });
      setCurrentPage(document.placement.pageIndex);
    }
  }, [document.placement]);

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
      const newWidth = Math.max(50, startWidth + deltaX);
      const newHeight = newWidth / aspectRatio;
      setSignatureSize({ width: newWidth, height: newHeight });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [signatureSize]);

  const handleApply = useCallback(() => {
    const placement: SignaturePlacement = {
      pageIndex: currentPage,
      uiRect: { x: signaturePos.x, y: signaturePos.y, width: signatureSize.width, height: signatureSize.height },
      viewportSize,
    };
    onApply(placement);
  }, [currentPage, signaturePos, signatureSize, viewportSize, onApply]);

  const handleApplyToAll = useCallback(() => {
    const placement: SignaturePlacement = {
      pageIndex: currentPage,
      uiRect: { x: signaturePos.x, y: signaturePos.y, width: signatureSize.width, height: signatureSize.height },
      viewportSize,
    };
    onApplyToAll(placement);
  }, [currentPage, signaturePos, signatureSize, viewportSize, onApplyToAll]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col">
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
          <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(2, s + 0.2))}>
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
      
      <div ref={containerRef} className="flex-1 overflow-auto p-8 flex items-start justify-center bg-muted">
        <div className="relative shadow-xl">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          )}
          
          <canvas ref={canvasRef} className="block bg-white" />
          
          <Draggable nodeRef={nodeRef} position={signaturePos} onDrag={handleDrag} bounds="parent" disabled={isResizing}>
            <div ref={nodeRef} className="absolute border-2 border-primary border-dashed cursor-move bg-white/80"
              style={{ width: signatureSize.width, height: signatureSize.height }}>
              <img src={signature} alt="Assinatura" className="w-full h-full object-contain pointer-events-none" draggable={false} />
              <div className="absolute w-4 h-4 bg-primary rounded-full cursor-se-resize" style={{ right: -8, bottom: -8 }} onMouseDown={handleResizeStart} />
            </div>
          </Draggable>
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-4 p-4 border-t border-border bg-card">
        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-foreground">Página {currentPage + 1} de {document.pageCount}</span>
        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(document.pageCount - 1, p + 1))} disabled={currentPage === document.pageCount - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
