import React, { useState } from 'react';
import { CreditCard, Check, Loader2, Copy, Key } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usedSignatures: number;
  freeLimit: number;
  onLoginClick: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  open,
  onOpenChange,
  usedSignatures,
  freeLimit,
  onLoginClick,
}) => {
  const { user, simulatePurchase } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [accessKey, setAccessKey] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!user) {
      onOpenChange(false);
      onLoginClick();
      return;
    }

    setIsProcessing(true);
    const result = await simulatePurchase();
    setIsProcessing(false);

    if (result.success && result.accessKey) {
      setAccessKey(result.accessKey);
      setPurchaseComplete(true);
      toast.success('Compra realizada com sucesso!');
    } else {
      toast.error('Erro ao processar compra');
    }
  };

  const copyAccessKey = () => {
    if (accessKey) {
      navigator.clipboard.writeText(accessKey);
      toast.success('Chave copiada para a área de transferência');
    }
  };

  const handleClose = () => {
    setPurchaseComplete(false);
    setAccessKey(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!purchaseComplete ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                Limite de assinaturas atingido
              </DialogTitle>
              <DialogDescription className="text-center">
                Você utilizou {usedSignatures} de {freeLimit} assinaturas gratuitas.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <CreditCard className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">R$ 2,90</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Pagamento único
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Assinaturas ilimitadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Processamento local seguro</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Chave de acesso exclusiva</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-success" />
                  <span>Suporte prioritário</span>
                </div>
              </div>
              
              {!user && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Você precisa estar logado para fazer a compra.
                  </p>
                </div>
              )}
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : !user ? (
                  'Fazer login para comprar'
                ) : (
                  'Comprar acesso ilimitado'
                )}
              </Button>
              
              <p className="text-xs text-muted-foreground text-center">
                Simulação de pagamento. Nenhum valor será cobrado.
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-center text-success">
                Compra realizada com sucesso!
              </DialogTitle>
              <DialogDescription className="text-center">
                Você agora tem acesso ilimitado ao PDF Signer.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
                  <Key className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Sua chave de acesso:
                </h3>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 text-sm font-mono break-all">
                    {accessKey}
                  </code>
                  <Button size="sm" variant="ghost" onClick={copyAccessKey}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Guarde esta chave! Ela está vinculada à sua conta.
                </p>
              </div>
              
              <Button className="w-full" onClick={handleClose}>
                Continuar assinando
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
