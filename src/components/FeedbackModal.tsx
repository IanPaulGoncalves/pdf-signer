import React, { useState } from 'react';
import { MessageSquare, Bug, Lightbulb, Send, Loader2, CheckCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

type FeedbackType = 'suggestion' | 'bug' | 'other';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onOpenChange }) => {
    const { user } = useAuth();
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message.trim()) {
            toast.error('Por favor, escreva sua mensagem');
            return;
        }

        // Validação básica de email se não estiver logado
        if (!user && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Por favor, insira um email válido');
            return;
        }

        setIsLoading(true);

        try {
            // Get Supabase URL and anon key from the client instance
            const supabaseUrl = supabase.supabaseUrl;
            const anonKey = supabase.supabaseKey;

            if (!supabaseUrl || !anonKey) {
                throw new Error('Supabase not properly configured');
            }

            // Use fetch directly to avoid JWT validation issues with Edge Functions
            const response = await fetch(
                `${supabaseUrl}/functions/v1/send-feedback`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${anonKey}`,
                    },
                    body: JSON.stringify({
                        type: feedbackType,
                        message: message.trim(),
                        email: user?.email || email || 'anônimo',
                        userId: user?.id || null,
                        userAgent: navigator.userAgent,
                        timestamp: new Date().toISOString(),
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error: ${response.status}`);
            }

            const data = await response.json();

            setIsSent(true);
            toast.success('Feedback enviado com sucesso!');

            // Reset form after 2 seconds and close modal
            setTimeout(() => {
                setMessage('');
                setEmail('');
                setFeedbackType('suggestion');
                setIsSent(false);
                onOpenChange(false);
            }, 2000);
        } catch (error) {
            console.error('Error sending feedback:', error);
            toast.error('Erro ao enviar feedback. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!isLoading) {
            if (!open) {
                // Reset when closing
                setTimeout(() => {
                    setMessage('');
                    setEmail('');
                    setFeedbackType('suggestion');
                    setIsSent(false);
                }, 200);
            }
            onOpenChange(open);
        }
    };

    const getFeedbackTypeLabel = (type: FeedbackType) => {
        switch (type) {
            case 'suggestion':
                return 'Sugestão';
            case 'bug':
                return 'Reportar problema';
            case 'other':
                return 'Outro';
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Enviar Feedback
                    </DialogTitle>
                    <DialogDescription>
                        Ajude-nos a melhorar! Envie sugestões ou reporte problemas.
                    </DialogDescription>
                </DialogHeader>

                {isSent ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Feedback enviado!</h3>
                        <p className="text-sm text-muted-foreground">
                            Obrigado por sua contribuição. Sua mensagem foi recebida.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label>Tipo de feedback</Label>
                            <RadioGroup
                                value={feedbackType}
                                onValueChange={(value) => setFeedbackType(value as FeedbackType)}
                                className="grid grid-cols-3 gap-3"
                            >
                                <div>
                                    <RadioGroupItem
                                        value="suggestion"
                                        id="suggestion"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="suggestion"
                                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                    >
                                        <Lightbulb className="w-5 h-5" />
                                        <span className="text-xs font-medium">Sugestão</span>
                                    </Label>
                                </div>

                                <div>
                                    <RadioGroupItem
                                        value="bug"
                                        id="bug"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="bug"
                                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                    >
                                        <Bug className="w-5 h-5" />
                                        <span className="text-xs font-medium">Problema</span>
                                    </Label>
                                </div>

                                <div>
                                    <RadioGroupItem
                                        value="other"
                                        id="other"
                                        className="peer sr-only"
                                    />
                                    <Label
                                        htmlFor="other"
                                        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                                    >
                                        <MessageSquare className="w-5 h-5" />
                                        <span className="text-xs font-medium">Outro</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {!user && (
                            <div className="space-y-2">
                                <Label htmlFor="feedback-email">
                                    Email (opcional)
                                </Label>
                                <Input
                                    id="feedback-email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Deixe seu email se quiser receber uma resposta
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="feedback-message">
                                Mensagem
                            </Label>
                            <Textarea
                                id="feedback-message"
                                placeholder={
                                    feedbackType === 'suggestion'
                                        ? 'Descreva sua sugestão...'
                                        : feedbackType === 'bug'
                                            ? 'Descreva o problema que encontrou...'
                                            : 'Escreva sua mensagem...'
                                }
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isLoading}
                                rows={6}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Quanto mais detalhes, melhor poderemos ajudar
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isLoading || !message.trim()}
                                className="flex-1"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};
