import React from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PdfDocument } from '@/types';
import { cn } from '@/lib/utils';

interface SignaturePreviewProps {
    document: PdfDocument;
    onAccept: () => void;
    onReject: () => void;
    onEdit: () => void;
}

export const SignaturePreview: React.FC<SignaturePreviewProps> = ({
    document,
    onAccept,
    onReject,
    onEdit,
}) => {
    const placement = document.placement;

    if (!placement) {
        return null;
    }

    const isAutoDetected = document.status === 'auto-found';

    return (
        <div className="border border-border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate mb-1">
                        {document.name}
                    </h4>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={isAutoDetected ? "default" : "secondary"}
                            className="text-xs"
                        >
                            {isAutoDetected ? 'Campo Detectado' : 'Posição Manual'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            Página {placement.pageIndex + 1}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mb-3 p-3 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground/80">
                    {isAutoDetected ? 'Posição detectada automaticamente.' : 'Posição definida manualmente.'} Revise se está correta antes de prosseguir.
                </p>
            </div>

            <div className="flex gap-2 flex-wrap">
                <Button
                    onClick={onAccept}
                    size="sm"
                    className="flex-1 gap-2"
                >
                    <Check className="w-4 h-4" />
                    Confirmar posição
                </Button>
                <Button
                    onClick={onEdit}
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2"
                >
                    <Pencil className="w-4 h-4" />
                    Editar
                </Button>
                <Button
                    onClick={onReject}
                    size="sm"
                    variant="ghost"
                    className="gap-2"
                >
                    <X className="w-4 h-4" />
                    Rejeitar
                </Button>
            </div>
        </div>
    );
};
