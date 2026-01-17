import React, { useState, useEffect } from 'react';
import { Eye, X, Download, Lock, Crown } from 'lucide-react';
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
    isPremium: boolean;
    isLoggedIn: boolean;
    onUpgrade: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
    document,
    isPremium,
    isLoggedIn,
    onUpgrade,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && document.signedBlob && isPremium && isLoggedIn) {
            // Create URL for signed PDF
            const url = URL.createObjectURL(document.signedBlob);
            setPdfUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [isOpen, document.signedBlob, isPremium, isLoggedIn]);

    const canPreview = isPremium && isLoggedIn && document.status === 'signed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={!canPreview}
                >
                    {canPreview ? (
                        <>
                            <Eye className="w-4 h-4" />
                            Visualizar PDF
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4" />
                            Visualizar PDF
                        </>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {canPreview ? (
                            <>
                                <Eye className="w-5 h-5" />
                                Visualização do PDF Assinado
                            </>
                        ) : (
                            <>
                                <Crown className="w-5 h-5 text-amber-500" />
                                Recurso Premium
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {canPreview ? (
                            `Pré-visualização de: ${document.name}`
                        ) : !isLoggedIn ? (
                            'Faça login para acessar a visualização de PDFs'
                        ) : !isPremium ? (
                            'Atualize para Premium para visualizar PDFs antes de baixar'
                        ) : (
                            'Este documento ainda não foi assinado'
                        )}
                    </DialogDescription>
                </DialogHeader>

                {canPreview ? (
                    <div className="flex-1 overflow-hidden rounded-lg border border-border">
                        <iframe
                            src={pdfUrl || ''}
                            className="w-full h-full"
                            title={`Preview: ${document.name}`}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            {!isLoggedIn ? (
                                <Lock className="w-8 h-8 text-primary" />
                            ) : (
                                <Crown className="w-8 h-8 text-amber-500" />
                            )}
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                            {!isLoggedIn ? 'Login Necessário' : 'Recurso Premium'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                            {!isLoggedIn
                                ? 'Crie uma conta ou faça login para acessar a visualização de PDFs assinados.'
                                : 'Visualize seus PDFs assinados antes de baixar com o plano Premium. Tenha certeza absoluta de que tudo está correto!'}
                        </p>
                        {!isLoggedIn ? (
                            <Button onClick={() => setIsOpen(false)}>
                                Fazer Login
                            </Button>
                        ) : (
                            <Button onClick={onUpgrade} className="gap-2">
                                <Crown className="w-4 h-4" />
                                Atualizar para Premium
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};
