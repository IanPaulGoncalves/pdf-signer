import React, { useState, useCallback, useEffect } from 'react';
import { FileText, PenLine, Shield, ArrowRight, ArrowLeft, Sparkles, Check, AlertCircle, ListChecks } from 'lucide-react';
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
import { ThemeToggle } from '@/components/ThemeToggle';
import { SmartFieldsConfig } from '@/components/SmartFieldsConfig';
import { SignaturePreview } from '@/components/SignaturePreview';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { getPageCount, getPageDimensions } from '@/lib/pdfRender';
import { signPdf } from '@/lib/pdfSign';
import { findSignatureAnchor, calculateSignaturePlacement } from '@/lib/pdfTextAnchor';
import { toast } from 'sonner';
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
  const [showPreview, setShowPreview] = useState(false);
  const [reviewedDocs, setReviewedDocs] = useState<Set<string>>(new Set());

  const markDocReviewed = useCallback((docId: string) => {
    setReviewedDocs(prev => {
      const next = new Set(prev);
      next.add(docId);
      return next;
    });
  }, []);

  const unmarkDocReviewed = useCallback((docId: string) => {
    setReviewedDocs(prev => {
      if (!prev.has(docId)) return prev;
      const next = new Set(prev);
      next.delete(docId);
      return next;
    });
  }, []);

  const { user, profile, incrementSignaturesUsed } = useAuth();
  const { effectiveTheme } = useTheme();

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
    unmarkDocReviewed(id);
    setState(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id),
    }));
  }, [unmarkDocReviewed]);

  // Set signature
  const handleSignatureCreate = useCallback((dataUrl: string) => {
    setState(prev => ({
      ...prev,
      signature: dataUrl || null,
    }));
  }, []);

  // Process documents - try to find signature fields automatically
  const handleProcess = useCallback(async () => {
    if (!state.signature) return;

    setReviewedDocs(new Set());
    setShowPreview(true);
    setIsProcessing(true);

    // First, mark all documents as processing
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        (doc.status === 'waiting' || doc.status === 'review') && doc.status !== 'signed' && doc.status !== 'error'
          ? { ...doc, status: 'processing' as const }
          : doc
      )
    }));

    const updatedDocs = await Promise.all(
      state.documents.map(async (doc) => {
        // Don't reset status of already signed documents
        if (doc.status === 'error' || doc.status === 'signed') return doc;

        // If document already has placement and is ready/reviewed, keep its status
        if ((doc.status === 'auto-found' || doc.status === 'review') && doc.placement) {
          return doc;
        }

        // Try to find signature anchor automatically
        try {
          console.log(`[Processing] Detecting fields in: ${doc.name}`);
          const anchor = await findSignatureAnchor(doc.file, 8);

          if (anchor) {
            // Found an anchor! Calculate placement
            const pageDims = await getPageDimensions(doc.file, anchor.pageIndex);
            const placement = calculateSignaturePlacement(anchor, 200, 80, 10);

            console.log(`[Processing] ✓ Field found in: ${doc.name}`);

            return {
              ...doc,
              status: 'auto-found' as const,
              placement: {
                pageIndex: anchor.pageIndex,
                uiRect: placement,
                viewportSize: { width: pageDims.width, height: pageDims.height },
              },
            };
          }
        } catch (error) {
          console.error(`[Processing] Error detecting field in ${doc.name}:`, error);
        }

        // No anchor found - use default placement
        console.log(`[Processing] No field found in: ${doc.name}, using default position`);
        return {
          ...doc,
          status: 'review' as const,
          placement: {
            pageIndex: doc.pageCount - 1, // Default to last page
            uiRect: { x: 100, y: 100, width: 200, height: 80 },
            viewportSize: { width: 800, height: 600 },
          },
        };
      })
    );

    // Count how many fields were auto-detected
    const autoDetectedCount = updatedDocs.filter(d => d.status === 'auto-found').length;
    const needsReviewCount = updatedDocs.filter(d => d.status === 'review' || d.status === 'auto-found').length;

    // ALWAYS show preview for security (mandatory review)
    setShowPreview(true);

    if (autoDetectedCount > 0) {
      toast.success(
        `${autoDetectedCount} campo${autoDetectedCount !== 1 ? 's' : ''} detectado${autoDetectedCount !== 1 ? 's' : ''}!`,
        {
          description: 'Revisão obrigatória: Confirme cada posição antes de assinar.'
        }
      );
    } else {
      toast.info(
        'Nenhum campo detectado automaticamente',
        {
          description: 'Revisão obrigatória: Posicione e confirme antes de assinar.'
        }
      );
    }

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
          ? { ...doc, status: 'auto-found', placement, signedBlob: undefined }
          : doc
      ),
    }));

    markDocReviewed(editingDocId);

    const docName = state.documents.find(d => d.id === editingDocId)?.name;

    toast.success('Posição aplicada com sucesso!', {
      description: `Você pode continuar editando ou confirmar a posição.`,
      action: {
        label: 'Editar Novamente',
        onClick: () => {
          // Reabrir editor
          setTimeout(() => setEditingDocId(editingDocId), 100);
        }
      }
    });

    setEditingDocId(null);
    setShowPreview(true);
  }, [editingDocId, markDocReviewed, state.documents]);

  // Preview handlers
  const handleAcceptPreview = useCallback((docId: string) => {
    markDocReviewed(docId);
    toast.success('Posição da assinatura confirmada');
  }, [markDocReviewed]);

  const handleRejectPreview = useCallback((docId: string) => {
    unmarkDocReviewed(docId);
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === docId
          ? {
            ...doc,
            status: 'review' as const,
            placement: {
              pageIndex: doc.pageCount - 1,
              uiRect: { x: 100, y: 100, width: 200, height: 80 },
              viewportSize: { width: 800, height: 600 },
            },
          }
          : doc
      ),
    }));
    toast.info('Campo rejeitado. Posicione manualmente.');
    setShowPreview(true);
  }, [unmarkDocReviewed]);

  const handleEditPreview = useCallback((docId: string) => {
    unmarkDocReviewed(docId);
    setEditingDocId(docId);
    setShowPreview(true);
  }, [unmarkDocReviewed]);

  const handleReviewDocument = useCallback((docId: string) => {
    unmarkDocReviewed(docId);
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === docId
          ? {
            ...doc,
            status: doc.status === 'signed' ? 'auto-found' : doc.status,
            signedBlob: doc.status === 'signed' ? undefined : doc.signedBlob,
          }
          : doc
      ),
    }));
    setEditingDocId(docId);
    setShowPreview(true);
  }, [unmarkDocReviewed]);

  const handleAcceptAllPreviews = useCallback(() => {
    const reviewableIds = state.documents
      .filter(doc => (doc.status === 'auto-found' || doc.status === 'review') && doc.placement && doc.status !== 'signed')
      .map(doc => doc.id);

    setReviewedDocs(new Set(reviewableIds));
    setShowPreview(false);
    toast.success('Todas as posições confirmadas');
  }, [state.documents]);

  const handleRejectAllPreviews = useCallback(() => {
    setReviewedDocs(new Set());
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.status === 'auto-found'
          ? {
            ...doc,
            status: 'review' as const,
            placement: {
              pageIndex: doc.pageCount - 1,
              uiRect: { x: 100, y: 100, width: 200, height: 80 },
              viewportSize: { width: 800, height: 600 },
            },
          }
          : doc
      ),
    }));
    setShowPreview(false);
    toast.info('Todos os campos rejeitados. Posicione manualmente.');
  }, []);

  // Apply placement to all documents
  const handleApplyToAll = useCallback((placement: SignaturePlacement) => {
    const updatedIds: string[] = [];

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.status === 'error' || doc.status === 'signed') return doc;
        updatedIds.push(doc.id);
        return { ...doc, status: 'auto-found', placement, signedBlob: undefined };
      }),
    }));

    updatedIds.forEach(markDocReviewed);
    setEditingDocId(null);
    setShowPreview(true);
  }, [markDocReviewed]);

  // Sign all documents
  const handleSignAll = useCallback(async () => {
    if (!state.signature) return;

    const reviewableDocs = state.documents.filter(d =>
      (d.status === 'auto-found' || d.status === 'review') && d.placement && d.status !== 'signed'
    );
    const pendingReviewDocs = reviewableDocs.filter(d => !reviewedDocs.has(d.id));

    if (pendingReviewDocs.length > 0) {
      toast.error('Ainda há documentos para revisar', {
        description: `${pendingReviewDocs.length} documento${pendingReviewDocs.length !== 1 ? 's' : ''} precisa${pendingReviewDocs.length !== 1 ? 'm' : ''} ser confirmado antes da assinatura.`
      });
      return;
    }

    // Only sign documents that have been reviewed/confirmed
    const docsToSign = reviewableDocs.filter(d => reviewedDocs.has(d.id));

    if (docsToSign.length === 0) {
      toast.error('Nenhum documento revisado para assinar', {
        description: 'Clique em "Revisar" em cada documento antes de assinar.'
      });
      return;
    }

    // Check limit before signing
    if (!checkLimitAndProceed(docsToSign.length)) {
      return;
    }

    setIsProcessing(true);

    const updatedDocs = [...state.documents];
    let signedCount = 0;

    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      // Skip if not reviewed or already signed or error
      if (!reviewedDocs.has(doc.id)) continue;
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

    // Check if there are more documents that CAN be signed (have placement but aren't signed yet)
    const hasMoreToSign = updatedDocs.some(d =>
      (d.status === 'auto-found' || d.status === 'review') &&
      d.placement &&
      d.status !== 'signed'
    );

    if (!hasMoreToSign) {
      // All documents that can be signed are signed, go to export
      setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 3 }));
    } else {
      // There are still documents that can be signed
      setState(prev => ({ ...prev, documents: updatedDocs }));
      toast.info('Ainda há documentos para revisar e assinar', {
        description: 'Revise e confirme os documentos restantes.'
      });
    }

    setIsProcessing(false);
  }, [state.signature, state.documents, checkLimitAndProceed, incrementSignaturesUsed, reviewedDocs]);

  // Navigation
  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 0:
        return state.documents.length > 0 && state.documents.some(d => d.status !== 'error');
      case 1:
        return !!state.signature;
      case 2:
        const reviewableDocs = state.documents.filter(d =>
          (d.status === 'auto-found' || d.status === 'review') && d.placement && d.status !== 'signed'
        );
        const pendingReviewDocs = reviewableDocs.filter(d => !reviewedDocs.has(d.id));
        const hasSignedDocs = state.documents.some(d => d.status === 'signed');
        return pendingReviewDocs.length === 0 && (hasSignedDocs || reviewableDocs.length > 0);
      default:
        return false;
    }
  }, [reviewedDocs, state.currentStep, state.documents, state.signature]);

  const goNext = useCallback(() => {
    if (state.currentStep === 1) {
      handleProcess();
    } else if (state.currentStep === 2) {
      const reviewableDocs = state.documents.filter(d =>
        (d.status === 'auto-found' || d.status === 'review') && d.placement && d.status !== 'signed'
      );
      const pendingReviewDocs = reviewableDocs.filter(d => !reviewedDocs.has(d.id));

      // Block navigation if there are pending reviews
      if (pendingReviewDocs.length > 0) {
        toast.error('Finalize a revisão antes de prosseguir', {
          description: `${pendingReviewDocs.length} documento${pendingReviewDocs.length !== 1 ? 's' : ''} ainda precisa${pendingReviewDocs.length !== 1 ? 'm' : ''} ser revisado${pendingReviewDocs.length !== 1 ? 's' : ''}.`
        });
        return;
      }

      // If there are reviewable docs that still need assinatura, assine antes de seguir
      const unsignedReviewables = reviewableDocs.filter(d => !d.signedBlob);
      if (unsignedReviewables.length > 0) {
        handleSignAll();
        return;
      }

      // Caso contrário, todos já assinados => pode ir para exportar
      setState(prev => ({ ...prev, currentStep: 3 }));
    } else {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [handleProcess, handleSignAll, reviewedDocs, state.currentStep, state.documents]);

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const docsNeedingReview = state.documents.filter(d => d.status === 'review');
  const docsReady = state.documents.filter(d => d.status === 'auto-found' && d.status !== 'signed');
  const docsSigned = state.documents.filter(d => d.status === 'signed');
  const reviewableDocs = state.documents.filter(d =>
    (d.status === 'auto-found' || d.status === 'review') && d.placement && d.status !== 'signed'
  );
  const pendingReviewDocs = reviewableDocs.filter(d => !reviewedDocs.has(d.id));
  const reviewedReadyDocs = reviewableDocs.filter(d => reviewedDocs.has(d.id));
  const allReviewableReviewed = reviewableDocs.length > 0 && pendingReviewDocs.length === 0;

  useEffect(() => {
    if (pendingReviewDocs.length > 0) {
      setShowPreview(true);
    }
  }, [pendingReviewDocs.length]);

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
                <p className="text-xs text-muted-foreground">Assinatura visual local</p>
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

              <SmartFieldsConfig />

              <ThemeToggle />

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
                Clique em "Revisar" para posicionar a assinatura em cada documento
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {reviewableDocs.length > 0 && (
                <div className="mb-6 p-4 bg-muted/30 border border-border rounded-lg">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <ListChecks className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Revisados {reviewedReadyDocs.length}/{reviewableDocs.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pendingReviewDocs.length > 0
                            ? `${pendingReviewDocs.length} documento${pendingReviewDocs.length !== 1 ? 's' : ''} ainda precisa${pendingReviewDocs.length !== 1 ? 'm' : ''} ser confirmado.`
                            : 'Tudo revisado. Você pode seguir para assinar.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {pendingReviewDocs.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAcceptAllPreviews}
                          className="gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Marcar todos como revisados
                        </Button>
                      )}

                      {pendingReviewDocs.length > 0 && !showPreview && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowPreview(true)}
                        >
                          Revisar pendentes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {showPreview && pendingReviewDocs.length > 0 && (
                <div className="mb-6 space-y-4">
                  <div className="p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Revisão Obrigatória
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Detectamos {reviewableDocs.length} campo{reviewableDocs.length !== 1 ? 's' : ''} de assinatura. Por segurança, revise e confirme cada posição antes de assinar.
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          Esta é uma medida de segurança para garantir que a assinatura seja aplicada no local correto.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Revisar individualmente:
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAcceptAllPreviews}
                        className="gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Confirmar todos
                      </Button>
                    </div>
                    {pendingReviewDocs.map(doc => (
                      <SignaturePreview
                        key={doc.id}
                        document={doc}
                        onAccept={() => handleAcceptPreview(doc.id)}
                        onReject={() => handleRejectPreview(doc.id)}
                        onEdit={() => handleEditPreview(doc.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!showPreview && pendingReviewDocs.length > 0 && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Campos detectados automaticamente!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Encontramos {reviewableDocs.length} campo{reviewableDocs.length !== 1 ? 's' : ''} de assinatura.
                        Revise e ajuste a posição se necessário antes de assinar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {docsNeedingReview.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground">
                      Documentos para posicionar ({docsNeedingReview.length}):
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsProcessing(true);

                        // Re-run detection on documents that need review
                        const updatedDocs = await Promise.all(
                          state.documents.map(async (doc) => {
                            if (doc.status !== 'review') return doc;

                            try {
                              const anchor = await findSignatureAnchor(doc.file, 8);

                              if (anchor) {
                                const pageDims = await getPageDimensions(doc.file, anchor.pageIndex);
                                const placement = calculateSignaturePlacement(anchor, 200, 80, 10);

                                toast.success(`Campo detectado em: ${doc.name}`);

                                return {
                                  ...doc,
                                  status: 'auto-found' as const,
                                  placement: {
                                    pageIndex: anchor.pageIndex,
                                    uiRect: placement,
                                    viewportSize: { width: pageDims.width, height: pageDims.height },
                                  },
                                };
                              }
                            } catch (error) {
                              console.error('Error re-detecting field:', error);
                            }

                            return doc;
                          })
                        );

                        setState(prev => ({ ...prev, documents: updatedDocs }));
                        setIsProcessing(false);
                      }}
                      disabled={isProcessing}
                      className="gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Re-detectar Campos
                    </Button>
                  </div>
                  <PdfList
                    documents={docsNeedingReview}
                    onRemove={handleRemoveDocument}
                    onReview={handleReviewDocument}
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
                    onReview={handleReviewDocument}
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
                    onReview={handleReviewDocument}
                    showActions={true}
                  />
                </div>
              )}

              {(docsReady.length > 0 || docsNeedingReview.length > 0) && (
                <div className="mt-6 text-center">
                  <Button
                    size="lg"
                    onClick={handleSignAll}
                    disabled={isProcessing || !allReviewableReviewed}
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
                        {allReviewableReviewed ? (
                          `Assinar ${reviewedReadyDocs.length} documento(s) revisado(s)`
                        ) : (
                          'Revise os documentos primeiro'
                        )}
                      </>
                    )}
                  </Button>

                  {!isPremium && user && reviewedReadyDocs.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Você usará {reviewedReadyDocs.length} de suas {remainingFree} assinaturas restantes
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
                isPremium={isPremium}
                onLoginClick={() => setShowAuthModal(true)}
                onUpgradeClick={() => setShowPaymentModal(true)}
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
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  currentStep: 0,
                  documents: [],
                  signature: null,
                }));
                setReviewedDocs(new Set());
                setShowPreview(false);
              }}
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
          onCancel={() => {
            setEditingDocId(null);
            setShowPreview(true);
          }}
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
