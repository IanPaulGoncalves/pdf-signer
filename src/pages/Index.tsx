import React, { useState, useCallback } from 'react';
import { FileText, PenLine, Zap, Download, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StepIndicator } from '@/components/StepIndicator';
import { PdfDropzone } from '@/components/PdfDropzone';
import { PdfList } from '@/components/PdfList';
import { SignaturePad } from '@/components/SignaturePad';
import { SignatureUpload } from '@/components/SignatureUpload';
import { ManualEditor } from '@/components/ManualEditor';
import { ExportPanel } from '@/components/ExportPanel';
import { getPageCount } from '@/lib/pdfRender';
import { findSignatureAnchor, calculateSignaturePlacement } from '@/lib/pdfTextAnchor';
import { signPdf } from '@/lib/pdfSign';
import type { PdfDocument, SignaturePlacement, AppState } from '@/types';

const STEPS = ['Documentos', 'Assinatura', 'Processar', 'Revisar', 'Exportar'];
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
  
  const editingDoc = editingDocId 
    ? state.documents.find(d => d.id === editingDocId) 
    : null;

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

  // Process documents
  const handleProcess = useCallback(async () => {
    if (!state.signature) return;
    
    setIsProcessing(true);
    
    const updatedDocs = [...state.documents];
    
    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      if (doc.status === 'error') continue;
      
      // Update status to processing
      updatedDocs[i] = { ...doc, status: 'processing' };
      setState(prev => ({ ...prev, documents: [...updatedDocs] }));
      
      try {
        // Try to find signature anchor
        const anchor = await findSignatureAnchor(doc.file);
        
        if (anchor) {
          // Auto-found: calculate placement
          const placement = calculateSignaturePlacement(anchor);
          
          // Get viewport size (we'll use a standard scale)
          const scale = 1.5;
          const viewportWidth = placement.width * scale + 200;
          const viewportHeight = placement.height * scale + 200;
          
          updatedDocs[i] = {
            ...doc,
            status: 'auto-found',
            placement: {
              pageIndex: anchor.pageIndex,
              uiRect: {
                x: placement.x * scale,
                y: placement.y * scale,
                width: 200,
                height: 80,
              },
              viewportSize: {
                width: viewportWidth,
                height: viewportHeight,
              },
            },
          };
        } else {
          // Mark for manual review
          updatedDocs[i] = {
            ...doc,
            status: 'review',
            placement: {
              pageIndex: doc.pageCount - 1, // Default to last page
              uiRect: { x: 100, y: 100, width: 200, height: 80 },
              viewportSize: { width: 800, height: 600 },
            },
          };
        }
      } catch (error) {
        console.error('Error processing document:', error);
        updatedDocs[i] = {
          ...doc,
          status: 'error',
          errorMessage: 'Erro ao processar documento.',
        };
      }
    }
    
    setState(prev => ({ ...prev, documents: updatedDocs }));
    setIsProcessing(false);
    
    // Move to review step if any need manual review
    const hasReview = updatedDocs.some(d => d.status === 'review');
    setState(prev => ({ ...prev, currentStep: hasReview ? 3 : 4 }));
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
    
    setIsProcessing(true);
    
    const updatedDocs = [...state.documents];
    
    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      if (doc.status === 'error' || !doc.placement) continue;
      
      try {
        updatedDocs[i] = { ...doc, status: 'processing' };
        setState(prev => ({ ...prev, documents: [...updatedDocs] }));
        
        const signedBlob = await signPdf(doc.file, state.signature, doc.placement);
        
        updatedDocs[i] = {
          ...doc,
          status: 'signed',
          signedBlob,
        };
      } catch (error) {
        console.error('Error signing document:', error);
        updatedDocs[i] = {
          ...doc,
          status: 'error',
          errorMessage: 'Erro ao assinar documento.',
        };
      }
    }
    
    setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 4 }));
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
        return true;
      case 3:
        return state.documents.some(d => d.status === 'auto-found' || d.status === 'signed');
      default:
        return false;
    }
  }, [state.currentStep, state.documents, state.signature]);

  const goNext = useCallback(() => {
    if (state.currentStep === 2) {
      handleProcess();
    } else if (state.currentStep === 3) {
      handleSignAll();
    } else {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  }, [state.currentStep, handleProcess, handleSignAll]);

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const docsNeedingReview = state.documents.filter(d => d.status === 'review');
  const docsReady = state.documents.filter(d => d.status === 'auto-found' || d.status === 'signed');

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
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Processamento local</span>
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
      <main className="container max-w-5xl mx-auto py-8 px-4">
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
                Desenhe ou faça upload da sua assinatura
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Tabs defaultValue="draw" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="draw">Desenhar</TabsTrigger>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                </TabsList>
                
                <TabsContent value="draw" className="mt-6">
                  <SignaturePad
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
        
        {/* Step 2: Process */}
        {state.currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Processar documentos
              </h2>
              <p className="text-muted-foreground">
                O sistema tentará encontrar automaticamente o campo de assinatura
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <div className="p-6 bg-card rounded-xl border border-border text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Pronto para processar
                </h3>
                
                <p className="text-sm text-muted-foreground mb-6">
                  {state.documents.filter(d => d.status !== 'error').length} documento(s) serão analisados.
                  <br />
                  Campos não encontrados automaticamente poderão ser definidos manualmente.
                </p>
                
                <Button
                  size="lg"
                  onClick={handleProcess}
                  disabled={isProcessing}
                  className="min-w-40"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Assinar automaticamente
                    </>
                  )}
                </Button>
              </div>
              
              <div className="mt-6">
                <PdfList
                  documents={state.documents}
                  onRemove={() => {}}
                  showActions={false}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Step 3: Review */}
        {state.currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Revisar posicionamento
              </h2>
              <p className="text-muted-foreground">
                {docsNeedingReview.length > 0 
                  ? `${docsNeedingReview.length} documento(s) precisam de revisão manual`
                  : 'Todos os documentos estão prontos para assinar'
                }
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              {docsNeedingReview.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    Necessitam revisão manual:
                  </h3>
                  <PdfList
                    documents={docsNeedingReview}
                    onRemove={handleRemoveDocument}
                    onReview={setEditingDocId}
                  />
                </div>
              )}
              
              {docsReady.length > 0 && (
                <div>
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
            </div>
          </div>
        )}
        
        {/* Step 4: Export */}
        {state.currentStep === 4 && (
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
          
          {state.currentStep < 4 && (
            <Button
              onClick={goNext}
              disabled={!canGoNext() || isProcessing}
            >
              {state.currentStep === 2 ? 'Processar' : 
               state.currentStep === 3 ? 'Assinar' : 'Próximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {state.currentStep === 4 && (
            <Button
              variant="outline"
              onClick={() => setState(prev => ({ ...prev, currentStep: 0 }))}
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
    </div>
  );
};

export default Index;
