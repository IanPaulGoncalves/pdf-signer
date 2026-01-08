import React, { useRef, useCallback } from 'react';
import { Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SignatureUploadProps {
  onSignatureUpload: (dataUrl: string) => void;
  existingSignature?: string | null;
}

export const SignatureUpload: React.FC<SignatureUploadProps> = ({
  onSignatureUpload,
  existingSignature,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (PNG, JPG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      
      // Convert to PNG if not already
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngDataUrl = canvas.toDataURL('image/png');
          setPreview(pngDataUrl);
          onSignatureUpload(pngDataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [onSignatureUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const currentSignature = preview || existingSignature;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Image className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Upload de imagem</span>
      </div>
      
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
          isDragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        
        {currentSignature ? (
          <div className="space-y-3">
            <img
              src={currentSignature}
              alt="Assinatura"
              className="max-h-24 mx-auto object-contain"
            />
            <p className="text-sm text-muted-foreground">
              Clique ou arraste para substituir
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Arraste uma imagem ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG • Preferencialmente com fundo transparente
              </p>
            </div>
          </div>
        )}
      </div>
      
      {currentSignature && (
        <Button
          variant="outline"
          onClick={() => {
            setPreview(null);
            onSignatureUpload('');
          }}
          className="w-full"
        >
          Remover assinatura
        </Button>
      )}
    </div>
  );
};
