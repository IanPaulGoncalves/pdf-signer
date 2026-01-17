import React from 'react';
import { FileText, Trash2, CheckCircle, AlertTriangle, Clock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PdfDocument, DocumentStatus } from '@/types';

interface PdfListProps {
  documents: PdfDocument[];
  onRemove: (id: string) => void;
  onReview?: (id: string) => void;
  showActions?: boolean;
}

const statusConfig: Record<DocumentStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  waiting: { label: 'Aguardando', icon: Clock, className: 'status-waiting' },
  processing: { label: 'Processando', icon: Loader2, className: 'status-waiting' },
  'auto-found': { label: 'Campo detectado', icon: Sparkles, className: 'status-found' },
  review: { label: 'Revisar', icon: AlertTriangle, className: 'status-review' },
  signed: { label: 'Assinado', icon: CheckCircle, className: 'status-signed' },
  error: { label: 'Erro', icon: AlertCircle, className: 'status-error' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const PdfList: React.FC<PdfListProps> = ({
  documents,
  onRemove,
  onReview,
  showActions = true
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum documento adicionado</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const status = statusConfig[doc.status];
        const StatusIcon = status.icon;
        const canReview = ['review', 'auto-found', 'signed'].includes(doc.status);

        return (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors animate-fade-in"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate text-foreground">{doc.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatFileSize(doc.size)}</span>
                {doc.pageCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{doc.pageCount} página{doc.pageCount > 1 ? 's' : ''}</span>
                  </>
                )}
              </div>
            </div>

            <div className={cn('status-badge', status.className)}>
              <StatusIcon className={cn(
                'w-3 h-3 mr-1',
                doc.status === 'processing' && 'animate-spin'
              )} />
              {status.label}
            </div>

            {showActions && (
              <div className="flex items-center gap-1">
                {canReview && onReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReview(doc.id)}
                    className="text-xs"
                  >
                    {doc.status === 'signed' ? 'Editar' : 'Revisar'}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(doc.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {doc.errorMessage && (
              <p className="text-xs text-destructive mt-1">{doc.errorMessage}</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
