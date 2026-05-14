import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Download, FileText, MoveIcon, PenLine, Sparkles } from 'lucide-react';

export const OnboardingTutorial: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tutorialSeen');
    if (!hasSeenTutorial) {
      setTimeout(() => setOpen(true), 500);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('tutorialSeen', 'true');
    setOpen(false);
  };

  const slides = [
    {
      icon: <FileText className="w-12 h-12 text-primary mb-4" />,
      title: 'Envie seus PDFs',
      description: 'Adicione um ou varios documentos para assinar em lote.',
    },
    {
      icon: <PenLine className="w-12 h-12 text-primary mb-4" />,
      title: 'Crie sua assinatura',
      description: 'Desenhe, digite ou envie uma imagem da assinatura.',
    },
    {
      icon: <Sparkles className="w-12 h-12 text-primary mb-4" />,
      title: 'Use campos inteligentes',
      description: 'O app procura campos de assinatura automaticamente e mostra a confianca de cada sugestao.',
    },
    {
      icon: <MoveIcon className="w-12 h-12 text-primary mb-4" />,
      title: 'Revise e ajuste',
      description: 'Confirme os campos encontrados, adicione rubricas ou ajuste posicoes manualmente.',
    },
    {
      icon: <Download className="w-12 h-12 text-primary mb-4" />,
      title: 'Exporte',
      description: 'Baixe os PDFs assinados individualmente ou em ZIP.',
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Tutorial do PDF Signer</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center text-center py-6 px-4">
          {slides[currentSlide].icon}
          <h2 className="text-xl font-semibold mb-2">{slides[currentSlide].title}</h2>
          <p className="text-muted-foreground mb-6">{slides[currentSlide].description}</p>

          <div className="flex gap-2 mb-6">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-muted'}`}
              />
            ))}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 justify-between">
          <Button variant="ghost" onClick={handleClose} className="flex-1">Pular</Button>
          <div className="flex gap-2 flex-1">
            {currentSlide > 0 && (
              <Button variant="outline" onClick={() => setCurrentSlide(currentSlide - 1)} className="flex-1">
                Voltar
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1">
              {currentSlide === slides.length - 1 ? 'Comecar' : 'Proximo'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
