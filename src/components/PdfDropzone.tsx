import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles: number;
  currentCount: number;
  disabled?: boolean;
}

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({
  onFilesSelected,
  maxFiles,
  currentCount,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      const availableSlots = maxFiles - currentCount;
      const filesToAdd = files.slice(0, availableSlots);
      onFilesSelected(filesToAdd);
    }
  }, [disabled, maxFiles, currentCount, onFilesSelected]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      file => file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      const availableSlots = maxFiles - currentCount;
      const filesToAdd = files.slice(0, availableSlots);
      onFilesSelected(filesToAdd);
    }
    
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [maxFiles, currentCount, onFilesSelected]);

  const remainingSlots = maxFiles - currentCount;

  return (
    <div
      className={cn(
        'dropzone',
        isDragOver && 'dropzone-active',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            Arraste e solte seus PDFs aqui
          </p>
          <p className="text-sm text-muted-foreground">
            ou clique para selecionar arquivos
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Apenas arquivos PDF • Máximo {maxFiles} arquivos</span>
        </div>
        
        {remainingSlots < maxFiles && (
          <div className={cn(
            'flex items-center gap-2 text-xs',
            remainingSlots === 0 ? 'text-destructive' : 'text-warning'
          )}>
            <AlertCircle className="w-4 h-4" />
            <span>
              {remainingSlots === 0 
                ? 'Limite de arquivos atingido' 
                : `${remainingSlots} espaços restantes`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
