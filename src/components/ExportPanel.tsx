import React from 'react';
import { Download, FileArchive, CheckCircle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadBlob, createZipFromDocuments } from '@/lib/zipExport';
import type { PdfDocument } from '@/types';

interface ExportPanelProps {
  documents: PdfDocument[];
  isLoggedIn: boolean;
  onLoginClick: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ 
  documents, 
  isLoggedIn,
  onLoginClick 
}) => {
  const signedDocs = documents.filter(doc => doc.status === 'signed' && doc.signedBlob);
  
  const handleDownloadSingle = (doc: PdfDocument) => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    
    if (doc.signedBlob) {
      const signedName = doc.name.replace(/\.pdf$/i, '_assinado.pdf');
      downloadBlob(doc.signedBlob, signedName);
    }
  };
  
  const handleDownloadAll = async () => {
    if (!isLoggedIn) {
      onLoginClick();
      return;
    }
    
    try {
      const zipBlob = await createZipFromDocuments(documents);
      downloadBlob(zipBlob, 'documentos_assinados.zip');
    } catch (error) {
      console.error('Error creating ZIP:', error);
    }
  };
  
  if (signedDocs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum documento assinado para exportar</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {!isLoggedIn && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">
                Faça login para baixar
              </p>
              <p className="text-sm text-muted-foreground">
                É necessário estar logado para baixar os documentos assinados.
              </p>
            </div>
            <Button onClick={onLoginClick}>
              Fazer login
            </Button>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Documentos Prontos
          </h3>
          <p className="text-sm text-muted-foreground">
            {signedDocs.length} documento{signedDocs.length > 1 ? 's' : ''} assinado{signedDocs.length > 1 ? 's' : ''}
          </p>
        </div>
        
        {signedDocs.length > 1 && (
          <Button onClick={handleDownloadAll} variant="default">
            <FileArchive className="w-4 h-4 mr-2" />
            Baixar tudo em ZIP
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        {signedDocs.map(doc => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 bg-card rounded-lg border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  Assinado na página {(doc.placement?.pageIndex || 0) + 1}
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadSingle(doc)}
            >
              {isLoggedIn ? (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Login
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground text-center">
          🔒 Todos os arquivos foram processados localmente no seu navegador.
          <br />
          Nenhum dado foi enviado para servidores externos.
        </p>
      </div>
    </div>
  );
};
