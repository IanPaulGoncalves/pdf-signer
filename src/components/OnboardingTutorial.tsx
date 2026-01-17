import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { FileText, PenLine, MoveIcon, Download } from 'lucide-react';

interface OnboardingTutorialProps {
    isLoggedIn: boolean;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({ isLoggedIn }) => {
    const [open, setOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        // Só mostra o tutorial se o usuário NÃO estiver logado
        if (isLoggedIn) {
            setOpen(false);
            return;
        }

        const hasSeenTutorial = localStorage.getItem('tutorialSeen');
        if (!hasSeenTutorial) {
            // Pequeno delay para melhor experiência
            setTimeout(() => setOpen(true), 500);
        }
    }, [isLoggedIn]);

    const handleClose = () => {
        localStorage.setItem('tutorialSeen', 'true');
        setOpen(false);
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const slides = [
        {
            icon: <FileText className="w-12 h-12 text-primary mb-4" />,
            title: "Bem-vindo ao PDF Signer!",
            description: "Assine documentos PDF de forma rápida e visual. Vamos começar com um tour rápido."
        },
        {
            icon: <FileText className="w-12 h-12 text-primary mb-4" />,
            title: "1. Envie seus PDFs",
            description: "Arraste e solte ou clique para fazer upload dos documentos que deseja assinar."
        },
        {
            icon: <PenLine className="w-12 h-12 text-primary mb-4" />,
            title: "2. Crie sua assinatura",
            description: "Desenhe, faça upload de uma imagem ou digite sua assinatura. Escolha a opção que preferir!"
        },
        {
            icon: <MoveIcon className="w-12 h-12 text-primary mb-4" />,
            title: "3. Posicione nos documentos",
            description: "Clique onde deseja adicionar a assinatura ou use a detecção automática de campos."
        },
        {
            icon: <Download className="w-12 h-12 text-primary mb-4" />,
            title: "4. Exporte e pronto!",
            description: "Baixe seus documentos assinados. Simples assim!"
        }
    ];

    return (
        <Dialog open={open && !isLoggedIn} onOpenChange={(newOpen) => {
            // Só permite abrir se não estiver logado
            if (!isLoggedIn) {
                setOpen(newOpen);
            }
        }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="sr-only">Tutorial do PDF Signer</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center text-center py-6 px-4">
                    {slides[currentSlide].icon}
                    <h2 className="text-xl font-semibold mb-2">
                        {slides[currentSlide].title}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                        {slides[currentSlide].description}
                    </p>

                    {/* Indicadores de slide */}
                    <div className="flex gap-2 mb-6">
                        {slides.map((_, index) => (
                            <div
                                key={index}
                                className={`h-2 rounded-full transition-all ${index === currentSlide
                                    ? 'w-8 bg-primary'
                                    : 'w-2 bg-muted'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                <DialogFooter className="flex-row gap-2 justify-between">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="flex-1"
                    >
                        Pular
                    </Button>
                    <div className="flex gap-2 flex-1">
                        {currentSlide > 0 && (
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                className="flex-1"
                            >
                                Voltar
                            </Button>
                        )}
                        <Button
                            onClick={handleNext}
                            className="flex-1"
                        >
                            {currentSlide === slides.length - 1 ? 'Começar' : 'Próximo'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
