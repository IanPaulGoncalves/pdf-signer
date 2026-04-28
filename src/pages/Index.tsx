import React, { useState, useCallback } from 'react';
import { FileText, PenLine, Shield, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StepIndicator } from '@/components/StepIndicator';
import { PdfDropzone } from '@/components/PdfDropzone';
import { PdfList } from '@/components/PdfList';
import { SignaturePad } from '@/components/SignaturePad';
import { SignatureUpload } from '@/components/SignatureUpload';
import { SignatureText } from '@/components/SignatureText';
import { ManualEditor } from '@/components/ManualEditor';
import { ExportPanel } from '@/components/ExportPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { OnboardingTutorial } from '@/components/OnboardingTutorial';
import { useTheme } from '@/hooks/useTheme';
import { getPageCount } from '@/lib/pdfRender';
import { signPdf } from '@/lib/pdfSign';
import { toast } from 'sonner';
import type { PdfDocument, SignaturePlacement, AppState } from '@/types';

const STEPS = ['Documentos', 'Assinatura', 'Posicionar', 'Exportar'];
const MAX_DOCUMENTS = 20;

const Index = () => {
  const [state, setState] = useState<AppState>({
    documents: [],
    signature: null,
    currentStep: 0,
    maxDocuments: MAX_DOCUMENTS,
  });

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { effectiveTheme } = useTheme();

  // Add PDF files
  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newDocs: PdfDocument[] = [];

    for (const file of files) {
      try {
        const pageCount = await getPageCount(file);
        newDocs.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount,
          status: 'waiting',
        });
      } catch (error) {
        console.error('Error loading PDF:', error);
        newDocs.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          pageCount: 0,
          status: 'error',
          errorMessage: 'Erro ao carregar PDF. Arquivo pode estar protegido.',
        });
      }
    }

    setState(prev => ({
      ...prev,
      documents: [...prev.documents, ...newDocs],
    }));
  }, []);

  // Remove document
  const handleRemoveDocument = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id),
    }));
  }, []);

  // Set signature
  const handleSignatureCreate = useCallback((dataUrl: string) => {
    setState(prev => ({
      ...prev,
      signature: dataUrl || null,
    }));
  }, []);

  // Go to position step - documents need manual positioning
  const handleGoToPosition = useCallback(() => {
    if (!state.signature) return;

    // Mark all documents as needing review (manual positioning)
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.status === 'waiting' || doc.status === 'review'
          ? { ...doc, status: 'review' as const }
          : doc
      ),
      currentStep: 2,
    }));

    toast.info('Posicione a assinatura em cada documento', {
      description: 'Clique em "Posicionar" para definir onde a assinatura será aplicada.'
    });
  }, [state.signature]);

  // Apply signature placement from editor
  const handleApplyPlacement = useCallback((placement: SignaturePlacement) => {
    if (!editingDocId) return;

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === editingDocId
          ? { ...doc, status: 'review' as const, placement, signedBlob: undefined }
          : doc
      ),
    }));

    toast.success('Posição definida!', {
      description: 'Você pode assinar este documento agora.'
    });

    setEditingDocId(null);
  }, [editingDocId]);

  // Edit document position
  const handleEditDocument = useCallback((docId: string) => {
    setEditingDocId(docId);
  }, []);

  // Apply placement to all documents
  const handleApplyToAll = useCallback((placement: SignaturePlacement) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.status === 'error' || doc.status === 'signed') return doc;
        return { ...doc, status: 'review' as const, placement, signedBlob: undefined };
      }),
    }));

    toast.success('Posição aplicada a todos os documentos!');
    setEditingDocId(null);
  }, []);

  // Sign a single document
  const handleSignDocument = useCallback(async (docId: string) => {
    if (!state.signature) return;

    const doc = state.documents.find(d => d.id === docId);
    if (!doc || !doc.placement) {
      toast.error('Posicione a assinatura primeiro');
      return;
    }

    setIsProcessing(true);

    try {
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, status: 'processing' as const } : d
        ),
      }));

      const signedBlob = await signPdf(doc.file, state.signature, doc.placement);

      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, status: 'signed' as const, signedBlob } : d
        ),
      }));

      toast.success(`${doc.name} assinado com sucesso!`);
    } catch (error) {
      console.error('Error signing document:', error);
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId ? { ...d, status: 'error' as const, errorMessage: 'Erro ao assinar documento.' } : d
        ),
      }));
      toast.error('Erro ao assinar documento');
    } finally {
      setIsProcessing(false);
    }
  }, [state.signature, state.documents]);

  // Sign all documents with placement
  const handleSignAll = useCallback(async () => {
    if (!state.signature) return;

    const docsToSign = state.documents.filter(d =>
      d.status === 'review' && d.placement
    );

    if (docsToSign.length === 0) {
      toast.error('Nenhum documento pronto para assinar', {
        description: 'Posicione a assinatura em pelo menos um documento.'
      });
      return;
    }

    setIsProcessing(true);

    const updatedDocs = [...state.documents];
    let signedCount = 0;

    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      if (doc.status !== 'review' || !doc.placement) continue;

      try {
        updatedDocs[i] = { ...doc, status: 'processing' };
        setState(prev => ({ ...prev, documents: [...updatedDocs] }));

        const signedBlob = await signPdf(doc.file, state.signature, doc.placement);

        updatedDocs[i] = {
          ...doc,
          status: 'signed',
          signedBlob,
        };
        signedCount++;
      } catch (error) {
        console.error('Error signing document:', error);
        updatedDocs[i] = {
          ...doc,
          status: 'error',
          errorMessage: 'Erro ao assinar documento.',
        };
      }
    }

    if (signedCount > 0) {
      toast.success(`${signedCount} documento(s) assinado(s)!`);
    }

    // Check if all documents are signed
    const allSigned = updatedDocs.every(d => d.status === 'signed' || d.status === 'error');

    if (allSigned) {
      setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 3 }));
    } else {
      setState(prev => ({ ...prev, documents: updatedDocs }));
    }

    setIsProcessing(false);
  }, [state.signature, state.documents]);

  // Navigation
  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 0:
        return state.documents.length > 0 && state.documents.some(d => d.status !== 'error');
      case 1:
        return !!state.signature;
      case 2:
        // Can go next if there are signed documents
        return state.documents.some(d => d.status === 'signed');
      default:
        return false;
    }
  }, [state.currentStep, state.documents, state.signature]);

  const goNext = useCallback(() => {
    if (state.currentStep === 1) {
      handleGoToPosition();
    } else if (state.currentStep === 2) {
      // If there are documents ready to sign, sign them first
      const docsReady = state.documents.filter(d => d.status === 'review' && d.placement);
      if (docsReady.length > 0) {
        handleSignAll();
      } else if (state.documents.some(d => d.status === 'signed')) {
        // All signed, go to export
        setState(prev => ({ ...prev, currentStep: 3 }));
      } else {
        toast.error('Posicione a assinatura em pelo menos um documento');
      }
    } else {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [handleGoToPosition, handleSignAll, state.currentStep, state.documents]);

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const editingDoc = editingDocId
    ? state.documents.find(d => d.id === editingDocId) ?? null
    : null;

  // Document counts
  const docsWaiting = state.documents.filter(d => d.status === 'waiting' || (d.status === 'review' && !d.placement));
  const docsReady = state.documents.filter(d => d.status === 'review' && d.placement);
  const docsSigned = state.documents.filter(d => d.status === 'signed');

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTutorial />
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <PenLine className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PDF Signer</h1>
                <p className="text-xs text-muted-foreground">Assinatura visual local</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                    <Shield className="w-4 h-4" />
                    <span>Processamento local</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Seus PDFs são processados localmente no navegador, garantindo privacidade</TooltipContent>
              </Tooltip>

              <ThemeToggle />
            </div>
          </div>

          <StepIndicator
            steps={STEPS}
            currentStep={state.currentStep}
            onStepClick={(step) => {
              if (step < state.currentStep) {
                setState(prev => ({ ...prev, currentStep: step }));
              }
            }}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-5xl mx-auto py-8 px-4 pb-24">
        {/* Step 0: Upload PDFs */}
        {state.currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Adicione seus documentos
              </h2>
              <p className="text-muted-foreground">
                Selecione os PDFs que deseja assinar (máximo {MAX_DOCUMENTS} arquivos)
              </p>
            </div>

            <PdfDropzone
              onFilesSelected={handleFilesSelected}
              maxFiles={MAX_DOCUMENTS}
              currentCount={state.documents.length}
            />

            <PdfList
              documents={state.documents}
              onRemove={handleRemoveDocument}
            />
          </div>
        )}

        {/* Step 1: Signature */}
        {state.currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Defina sua assinatura
              </h2>
              <p className="text-muted-foreground">
                Desenhe, digite ou faça upload da sua assinatura
              </p>
              <div className="mt-3 p-3 bg-muted border border-border rounded-lg max-w-lg mx-auto">
                <p className="text-xs text-muted-foreground">
                  Assinatura visual/gráfica, não certificada digitalmente.
                </p>
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <Tabs defaultValue="draw" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="draw">Desenhar</TabsTrigger>
                  <TabsTrigger value="type">Digitar</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="draw" className="mt-6">
                  <SignaturePad
                    onSignatureCreate={handleSignatureCreate}
                    existingSignature={state.signature}
                  />
                </TabsContent>

                <TabsContent value="type" className="mt-6">
                  <SignatureText
                    onSignatureCreate={handleSignatureCreate}
                    existingSignature={state.signature}
                  />
                </TabsContent>

                <TabsContent value="upload" className="mt-6">
                  <SignatureUpload
                    onSignatureUpload={handleSignatureCreate}
                    existingSignature={state.signature}
                  />
                </TabsContent>
              </Tabs>

              {state.signature && (
                <div className="mt-6 p-4 bg-card rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground mb-3">
                    Prévia da assinatura:
                  </p>
                  <div className={`p-4 rounded-lg ${effectiveTheme === 'dark' ? 'bg-white' : 'bg-muted'
                    }`}>
                    <img
                      src={state.signature}
                      alt="Assinatura"
                      className="max-h-24 mx-auto object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Position Signatures */}
        {state.currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Posicione sua assinatura
              </h2>
              <p className="text-muted-foreground">
                Clique em "Posicionar" para definir onde a assinatura será aplicada em cada documento
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {/* Documents waiting for positioning */}
              {docsWaiting.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Aguardando posicionamento ({docsWaiting.length}):
                  </h3>
                  <div className="space-y-2">
                    {docsWaiting.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">{doc.pageCount} página(s)</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleEditDocument(doc.id)}
                        >
                          <PenLine className="w-4 h-4 mr-2" />
                          Posicionar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents ready to sign */}
              {docsReady.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Prontos para assinar ({docsReady.length}):
                  </h3>
                  <div className="space-y-2">
                    {docsReady.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-card rounded-lg border border-green-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Página {(doc.placement?.pageIndex ?? 0) + 1} de {doc.pageCount}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditDocument(doc.id)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSignDocument(doc.id)}
                            disabled={isProcessing}
                          >
                            Assinar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Already signed documents */}
              {docsSigned.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Já assinados ({docsSigned.length}):
                  </h3>
                  <div className="space-y-2">
                    {docsSigned.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30"
                      >
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{doc.name}</p>
                            <p className="text-xs text-green-600">Assinado com sucesso</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sign all button */}
              {docsReady.length > 0 && (
                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    onClick={handleSignAll}
                    disabled={isProcessing}
                    className="min-w-40"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                        Assinando...
                      </>
                    ) : (
                      <>
                        <PenLine className="w-4 h-4 mr-2" />
                        Assinar {docsReady.length} documento(s)
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* All signed - go to export */}
              {docsSigned.length > 0 && docsReady.length === 0 && docsWaiting.length === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Todos os documentos foram assinados!
                  </p>
                  <Button
                    size="lg"
                    onClick={() => setState(prev => ({ ...prev, currentStep: 3 }))}
                    className="min-w-40"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Ir para exportar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Export */}
        {state.currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Exportar documentos
              </h2>
              <p className="text-muted-foreground">
                Baixe os documentos assinados
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <ExportPanel documents={state.documents} />
            </div>
          </div>
        )}
      </main>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto py-4 px-4 flex items-center justify-between">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={state.currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            </TooltipTrigger>
            <TooltipContent>Voltar para a etapa anterior</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{state.documents.length} documento(s)</span>
          </div>

          {state.currentStep < 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={goNext}
                  disabled={!canGoNext() || isProcessing}
                >
                  {state.currentStep === 2 ? (
                    docsSigned.length > 0 && docsReady.length === 0 && docsWaiting.length === 0
                      ? 'Exportar'
                      : docsReady.length > 0
                        ? 'Assinar e Exportar'
                        : 'Próximo'
                  ) : 'Próximo'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {state.currentStep === 0 && 'Adicione documentos para continuar'}
                {state.currentStep === 1 && 'Crie sua assinatura para continuar'}
                {state.currentStep === 2 && 'Assinar todos os documentos'}
              </TooltipContent>
            </Tooltip>
          )}

          {state.currentStep === 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    setState({
                      documents: [],
                      signature: null,
                      currentStep: 0,
                      maxDocuments: MAX_DOCUMENTS,
                    });
                  }}
                >
                  Novo lote
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reiniciar e assinar novos documentos</TooltipContent>
            </Tooltip>
          )}
        </div>
      </footer>

      {/* Manual Editor Modal */}
      {editingDoc && state.signature && (
        <ManualEditor
          document={editingDoc}
          signature={state.signature}
          onApply={handleApplyPlacement}
          onApplyToAll={handleApplyToAll}
          onCancel={() => setEditingDocId(null)}
        />
      )}
    </div>
  );
};

export default Index;
