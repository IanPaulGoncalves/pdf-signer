import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { getCustomKeywords, saveCustomKeywords } from '@/lib/pdfTextAnchor';

export const SmartFieldsConfig: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [customKeywords, setCustomKeywords] = useState<string[]>([]);
    const [newKeyword, setNewKeyword] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCustomKeywords(getCustomKeywords());
        }
    }, [isOpen]);

    const handleAddKeyword = () => {
        const keyword = newKeyword.trim();
        if (keyword && !customKeywords.includes(keyword.toLowerCase())) {
            const updated = [...customKeywords, keyword.toLowerCase()];
            setCustomKeywords(updated);
            saveCustomKeywords(updated);
            setNewKeyword('');
        }
    };

    const handleRemoveKeyword = (keyword: string) => {
        const updated = customKeywords.filter(k => k !== keyword);
        setCustomKeywords(updated);
        saveCustomKeywords(updated);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddKeyword();
        }
    };

    const defaultKeywords = [
        'assinatura', 'responsável', 'testemunha', 'declarante',
        'signature', 'sign here', 'authorized by'
    ];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Campos Inteligentes
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Configurar Campos Inteligentes</DialogTitle>
                    <DialogDescription>
                        O sistema busca automaticamente por palavras-chave nos PDFs para detectar e sugerir
                        posições de assinatura, economizando tempo no posicionamento manual.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Default Keywords */}
                    <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Search className="w-4 h-4 text-muted-foreground" />
                            Palavras-chave padrão
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {defaultKeywords.map(keyword => (
                                <Badge key={keyword} variant="secondary" className="text-xs">
                                    {keyword}
                                </Badge>
                            ))}
                            <Badge variant="secondary" className="text-xs text-muted-foreground">
                                +{defaultKeywords.length - 7} mais...
                            </Badge>
                        </div>
                    </div>

                    {/* Custom Keywords */}
                    <div>
                        <h4 className="text-sm font-medium mb-2">
                            Suas palavras-chave personalizadas
                        </h4>

                        <div className="flex gap-2 mb-3">
                            <Input
                                placeholder="Digite uma palavra-chave..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <Button onClick={handleAddKeyword} size="sm">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {customKeywords.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {customKeywords.map(keyword => (
                                    <Badge
                                        key={keyword}
                                        variant="default"
                                        className="text-xs gap-1 pr-1"
                                    >
                                        {keyword}
                                        <button
                                            onClick={() => handleRemoveKeyword(keyword)}
                                            className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                                Nenhuma palavra-chave personalizada adicionada
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
                        <p>
                            💡 <strong>Dica:</strong> Adicione palavras ou frases que aparecem frequentemente
                            nos seus documentos próximas aos campos de assinatura. Exemplos: "Diretor", "Gerente",
                            "Aprovação", ou nomes específicos de cargos.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
