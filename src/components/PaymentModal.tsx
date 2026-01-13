import React from 'react';
import { Lock, CreditCard, FileText, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  usedSignatures: number;
  freeLimit: number;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onClose,
  usedSignatures,
  freeLimit,
}) => {
  const handlePayment = () => {
    // Here would integrate with Stripe
    // For now, just show an alert
    alert('Funcionalidade de pagamento será implementada em breve! Entre em contato pelo email: contato@pdfsigner.com');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Limite de assinaturas gratuitas
          </DialogTitle>
          <DialogDescription>
            Você utilizou {usedSignatures} de {freeLimit} assinaturas gratuitas.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Usage indicator */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-destructive rounded-full transition-all"
                style={{ width: '100%' }}
              />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {usedSignatures}/{freeLimit}
            </span>
          </div>
          
          {/* Benefits */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <h4 className="font-semibold text-foreground mb-3">
              Acesso ilimitado por apenas:
            </h4>
            <div className="text-3xl font-bold text-primary mb-4">
              R$ 2,90
              <span className="text-sm font-normal text-muted-foreground ml-1">
                /único
              </span>
            </div>
            
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-success" />
                Assinaturas ilimitadas
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-success" />
                Acesso vitalício
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-success" />
                Processamento 100% local
              </li>
              <li className="flex items-center gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-success" />
                Sem cadastro necessário
              </li>
            </ul>
          </div>
          
          {/* Payment buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handlePayment} 
              className="w-full"
              size="lg"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar R$ 2,90
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full"
            >
              Voltar
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            Pagamento seguro via Stripe. Não armazenamos dados do cartão.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
