import React, { useState, useCallback } from 'react';
import { FileText, PenLine, Download, Shield, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StepIndicator } from '@/components/StepIndicator';
import { PdfDropzone } from '@/components/PdfDropzone';
import { PdfList } from '@/components/PdfList';
import { SignaturePad } from '@/components/SignaturePad';
import { SignatureUpload } from '@/components/SignatureUpload';
import { SignatureText } from '@/components/SignatureText';
import { ManualEditor } from '@/components/ManualEditor';
import { ExportPanel } from '@/components/ExportPanel';
import { PaymentModal } from '@/components/PaymentModal';
import { AuthModal } from '@/components/AuthModal';
import { UserMenu } from '@/components/UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { getPageCount } from '@/lib/pdfRender';
import { signPdf } from '@/lib/pdfSign';
import type { PdfDocument, SignaturePlacement, AppState } from '@/types';

const STEPS = ['Documentos', 'Assinatura', 'Posicionar', 'Exportar'];
const MAX_DOCUMENTS = 20;
const FREE_LIMIT = 3;

const Index = () => {
  const [state, setState] = useState<AppState>({
    documents: [],
    signature: null,
    currentStep: 0,
    maxDocuments: MAX_DOCUMENTS,
  });

  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user, profile, incrementSignaturesUsed } = useAuth();

  // Computed values from profile or defaults
  const usedSignatures = profile?.signatures_used ?? 0;
  const isPremium = profile?.is_premium ?? false;
  const remainingFree = isPremium ? Infinity : Math.max(0, FREE_LIMIT - usedSignatures);

  const editingDoc = editingDocId
    ? state.documents.find(d => d.id === editingDocId)
    : null;

  // Check if user can sign more documents
  const canSign = useCallback((documentCount: number = 1): boolean => {
    if (isPremium) return true;
    return usedSignatures + documentCount <= FREE_LIMIT;
  }, [usedSignatures, isPremium]);

  // Check limit and show payment modal if needed
  const checkLimitAndProceed = useCallback((documentCount: number = 1): boolean => {
    if (isPremium) return true;

    if (usedSignatures + documentCount > FREE_LIMIT) {
      setShowPaymentModal(true);
      return false;
    }

    return true;
  }, [usedSignatures, isPremium]);

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

  // Process documents - now just marks them for manual review
  const handleProcess = useCallback(async () => {
    if (!state.signature) return;

    setIsProcessing(true);

    const updatedDocs = state.documents.map(doc => {
      // Don't reset status of already signed documents
      if (doc.status === 'error' || doc.status === 'signed') return doc;

      // If document already has placement and is ready/reviewed, keep its status
      if ((doc.status === 'auto-found' || doc.status === 'review') && doc.placement) {
        return doc;
      }

      return {
        ...doc,
        status: 'review' as const,
        placement: {
          pageIndex: doc.pageCount - 1, // Default to last page
          uiRect: { x: 100, y: 100, width: 200, height: 80 },
          viewportSize: { width: 800, height: 600 },
        },
      };
    });

    setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 2 }));
    setIsProcessing(false);
  }, [state.signature, state.documents]);

  // Apply signature placement from editor
  const handleApplyPlacement = useCallback((placement: SignaturePlacement) => {
    if (!editingDocId) return;

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === editingDocId
          ? { ...doc, status: 'auto-found', placement }
          : doc
      ),
    }));

    setEditingDocId(null);
  }, [editingDocId]);

  // Apply placement to all documents
  const handleApplyToAll = useCallback((placement: SignaturePlacement) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.status !== 'error' && doc.status !== 'signed'
          ? { ...doc, status: 'auto-found', placement }
          : doc
      ),
    }));

    setEditingDocId(null);
  }, []);

  // Sign all documents
  const handleSignAll = useCallback(async () => {
    if (!state.signature) return;

    const docsToSign = state.documents.filter(d =>
      (d.status === 'auto-found' || d.status === 'review') && d.placement
    );

    // Check limit before signing
    if (!checkLimitAndProceed(docsToSign.length)) {
      return;
    }

    setIsProcessing(true);

    const updatedDocs = [...state.documents];
    let signedCount = 0;

    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      if (doc.status === 'error' || !doc.placement) continue;
      if (doc.status === 'signed') continue;

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

    // Increment usage after successful signing
    if (signedCount > 0) {
      incrementSignaturesUsed(signedCount);
    }

    setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 3 }));
    setIsProcessing(false);
  }, [state.signature, state.documents, checkLimitAndProceed, incrementSignaturesUsed]);

  // Navigation
  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 0:
        return state.documents.length > 0 && state.documents.some(d => d.status !== 'error');
      case 1:
        return !!state.signature;
      case 2:
        return state.documents.some(d => d.status === 'auto-found' || d.status === 'review' || d.status === 'signed');
      default:
        return false;
    }
  }, [state.currentStep, state.documents, state.signature]);

  const goNext = useCallback(() => {
    if (state.currentStep === 1) {
      handleProcess();
    } else if (state.currentStep === 2) {
      // Check if there are already signed documents - if so, just go to export step
      const hasSignedDocs = state.documents.some(d => d.status === 'signed');
      if (hasSignedDocs) {
        setState(prev => ({ ...prev, currentStep: 3 }));
      } else {
        handleSignAll();
      }
    } else {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [state.currentStep, state.documents, handleProcess, handleSignAll]);

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const docsNeedingReview = state.documents.filter(d => d.status === 'review');
  const docsReady = state.documents.filter(d => d.status === 'auto-found');
  const docsSigned = state.documents.filter(d => d.status === 'signed');

  return (
    <div className="min-h-screen bg-background">
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
                <p className="text-xs text-muted-foreground">Assinatura digital local</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Usage indicator */}
              {user && !isPremium && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">
                    {remainingFree === Infinity ? '∞' : remainingFree} assinatura{remainingFree !== 1 ? 's' : ''} restante{remainingFree !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {user && isPremium && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-xs">
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-primary font-medium">Premium</span>
                </div>
              )}

              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Processamento local</span>
              </div>

              <UserMenu onLoginClick={() => setShowAuthModal(true)} />
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
                  <div className="bg-muted p-4 rounded-lg">
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
                Clique em "Revisar" para posicionar a assinatura em cada documento
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {docsNeedingReview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Documentos para posicionar ({docsNeedingReview.length}):
                  </h3>
                  <PdfList
                    documents={docsNeedingReview}
                    onRemove={handleRemoveDocument}
                    onReview={setEditingDocId}
                  />
                </div>
              )}

              {docsReady.length > 0 && (
                <div className={docsSigned.length > 0 ? "mb-6" : ""}>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Prontos para assinar ({docsReady.length}):
                  </h3>
                  <PdfList
                    documents={docsReady}
                    onRemove={handleRemoveDocument}
                    onReview={setEditingDocId}
                    showActions={true}
                  />
                </div>
              )}

              {docsSigned.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Já assinados ({docsSigned.length}):
                  </h3>
                  <PdfList
                    documents={docsSigned}
                    onRemove={handleRemoveDocument}
                    showActions={false}
                  />
                </div>
              )}

              {(docsReady.length > 0 || docsNeedingReview.length > 0) && (
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
                        Assinar {docsReady.length + docsNeedingReview.length} documento(s)
                      </>
                    )}
                  </Button>

                  {!isPremium && user && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Você usará {docsReady.length + docsNeedingReview.length} de suas {remainingFree} assinaturas restantes
                    </p>
                  )}
                </div>
              )}

              {docsSigned.length > 0 && docsReady.length === 0 && docsNeedingReview.length === 0 && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Todos os documentos já foram assinados. Você pode prosseguir para exportar.
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
              <ExportPanel
                documents={state.documents}
                isLoggedIn={!!user}
                onLoginClick={() => setShowAuthModal(true)}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto py-4 px-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={state.currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{state.documents.length} documento(s)</span>
          </div>

          {state.currentStep < 3 && (
            <Button
              onClick={goNext}
              disabled={!canGoNext() || isProcessing}
            >
              {state.currentStep === 2 ? (
                docsSigned.length > 0 && docsReady.length === 0 && docsNeedingReview.length === 0
                  ? 'Próximo'
                  : 'Assinar'
              ) : 'Próximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {state.currentStep === 3 && (
            <Button
              variant="outline"
              onClick={() => setState(prev => ({
                ...prev,
                currentStep: 0,
                documents: [],
                signature: null,
              }))}
            >
              Novo lote
            </Button>
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

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        usedSignatures={usedSignatures}
        freeLimit={FREE_LIMIT}
        onLoginClick={() => setShowAuthModal(true)}
      />

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
      />
    </div>
  );
};

export default Index;
