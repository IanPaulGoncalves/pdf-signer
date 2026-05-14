import React, { useEffect, useState } from 'react';
import { Plus, Search, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    if (isOpen) setCustomKeywords(getCustomKeywords());
  }, [isOpen]);

  const handleAddKeyword = () => {
    const keyword = newKeyword.trim().toLowerCase();
    if (!keyword || customKeywords.includes(keyword)) return;

    const updated = [...customKeywords, keyword];
    setCustomKeywords(updated);
    saveCustomKeywords(updated);
    setNewKeyword('');
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updated = customKeywords.filter(k => k !== keyword);
    setCustomKeywords(updated);
    saveCustomKeywords(updated);
  };

  const defaultKeywords = [
    'assinatura',
    'assine aqui',
    'testemunha',
    'responsavel',
    'sign here',
    'signature',
    '_____',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Sparkles className="w-4 h-4 mr-2" />
              Campos inteligentes
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Configurar palavras-chave da deteccao automatica</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Campos inteligentes</DialogTitle>
          <DialogDescription>
            O app procura palavras-chave, secoes de assinatura e linhas em branco para sugerir onde a assinatura deve entrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              Palavras-chave padrao
            </h4>
            <div className="flex flex-wrap gap-2">
              {defaultKeywords.map(keyword => (
                <Badge key={keyword} variant="secondary" className="text-xs">{keyword}</Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Palavras-chave personalizadas</h4>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Ex.: diretor, aceite, aprovado por"
                value={newKeyword}
                onChange={(event) => setNewKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddKeyword();
                  }
                }}
              />
              <Button onClick={handleAddKeyword} size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {customKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customKeywords.map(keyword => (
                  <Badge key={keyword} className="text-xs gap-1 pr-1">
                    {keyword}
                    <button
                      type="button"
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
                Nenhuma palavra-chave personalizada adicionada.
              </div>
            )}
          </div>

          <div className="bg-muted p-3 rounded-lg text-xs text-muted-foreground">
            Adicione termos que aparecem perto da assinatura nos seus modelos de PDF. Isso melhora a confianca da deteccao.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
