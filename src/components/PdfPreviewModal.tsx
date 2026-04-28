import React, { useState, useEffect } from 'react';
import { Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import type { PdfDocument } from '@/types';

interface PdfPreviewModalProps {
    document: PdfDocument;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ document }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && document.signedBlob) {
            const url = URL.createObjectURL(document.signedBlob);
            setPdfUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [isOpen, document.signedBlob]);

    const canPreview = document.status === 'signed' && !!document.signedBlob;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!canPreview}
                >
                    <Eye className="w-4 h-4" />
                    Visualizar
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl flex flex-col h-[90vh]">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" />
                        Visualização do PDF Assinado
                    </DialogTitle>
                    <DialogDescription>
                        {`Pré-visualização de: ${document.name}`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-border">
                    <iframe
                        src={pdfUrl || ''}
                        className="w-full h-full"
                        title={`Preview: ${document.name}`}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};
