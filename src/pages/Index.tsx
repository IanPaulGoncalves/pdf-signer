import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Copy,
  FileText,
  Fingerprint,
  PenLine,
  Plus,
  Save,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { SmartFieldsConfig } from '@/components/SmartFieldsConfig';
import { useTheme } from '@/hooks/useTheme';
import { getPageCount, getPageDimensions } from '@/lib/pdfRender';
import { signPdf } from '@/lib/pdfSign';
import { calculateSignaturePlacement, findAllSignatureAnchors } from '@/lib/pdfTextAnchor';
import {
  cloneTemplatePlacements,
  getPlacementTemplates,
  savePlacementTemplate,
  type PlacementTemplate,
} from '@/lib/placementTemplates';
import type { AppState, DocumentStatus, PdfDocument, SignaturePlacement } from '@/types';

const STEPS = ['Documentos', 'Assinatura', 'Campos', 'Exportar'];
const MAX_DOCUMENTS = 20;
const MAX_SMART_FIELDS_PER_DOCUMENT = 5;

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getPlacements(doc: PdfDocument): SignaturePlacement[] {
  return doc.placements?.length ? doc.placements : doc.placement ? [doc.placement] : [];
}

function withPlacements(doc: PdfDocument, placements: SignaturePlacement[], status: DocumentStatus = 'review'): PdfDocument {
  return {
    ...doc,
    status,
    placements,
    placement: placements[0],
    signedBlob: undefined,
    errorMessage: undefined,
  };
}

function placementSummary(placements: SignaturePlacement[]): string {
  const signatures = placements.filter(p => (p.type || 'signature') === 'signature').length;
  const initials = placements.filter(p => p.type === 'initials').length;
  const parts = [];
  if (signatures) parts.push(`${signatures} assinatura${signatures > 1 ? 's' : ''}`);
  if (initials) parts.push(`${initials} rubrica${initials > 1 ? 's' : ''}`);
  return parts.join(' + ') || 'Sem campos';
}

const Index = () => {
  const [state, setState] = useState<AppState>({
    documents: [],
    signature: null,
    initialsSignature: null,
    currentStep: 0,
    maxDocuments: MAX_DOCUMENTS,
  });
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingPlacementId, setEditingPlacementId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [templates, setTemplates] = useState<PlacementTemplate[]>([]);
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    setTemplates(getPlacementTemplates());
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const newDocs: PdfDocument[] = [];

    for (const file of files) {
      try {
        const pageCount = await getPageCount(file);
        newDocs.push({
          id: createId('doc'),
          file,
          name: file.name,
          size: file.size,
          pageCount,
          status: 'waiting',
        });
      } catch (error) {
        console.error('Erro ao carregar PDF:', error);
        newDocs.push({
          id: createId('doc'),
          file,
          name: file.name,
          size: file.size,
          pageCount: 0,
          status: 'error',
          errorMessage: 'Erro ao carregar PDF. O arquivo pode estar protegido.',
        });
      }
    }

    setState(prev => ({ ...prev, documents: [...prev.documents, ...newDocs] }));
  }, []);

  const handleRemoveDocument = useCallback((id: string) => {
    setState(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
  }, []);

  const handleSignatureCreate = useCallback((dataUrl: string) => {
    setState(prev => ({
      ...prev,
      signature: dataUrl || null,
      initialsSignature: dataUrl || prev.initialsSignature || null,
    }));
  }, []);

  const detectSmartFields = useCallback(async () => {
    if (!state.signature || isDetecting) return;

    const candidates = state.documents.filter(doc => doc.status !== 'error' && doc.status !== 'signed');
    if (!candidates.length) return;

    setIsDetecting(true);
    toast.info('Detectando campos de assinatura', {
      description: 'Buscando palavras-chave, linhas e seções de assinatura nos PDFs.',
    });

    const detectedDocs: PdfDocument[] = [];
    let detectedCount = 0;

    for (const doc of state.documents) {
      if (doc.status === 'error' || doc.status === 'signed') {
        detectedDocs.push(doc);
        continue;
      }

      try {
        const anchors = await findAllSignatureAnchors(doc.file);
        const placements = anchors
          .slice(0, MAX_SMART_FIELDS_PER_DOCUMENT)
          .map((anchor, index) => ({
            ...calculateSignaturePlacement(anchor),
            id: createId(`smart-${index}`),
            label: anchor.text || `Campo ${index + 1}`,
          }));

        if (placements.length) {
          detectedCount += placements.length;
          detectedDocs.push(withPlacements(doc, placements, 'auto-found'));
        } else {
          detectedDocs.push({ ...doc, status: 'review', placements: getPlacements(doc) });
        }
      } catch (error) {
        console.error('Erro na deteccao inteligente:', error);
        detectedDocs.push({
          ...doc,
          status: 'review',
          errorMessage: 'Nao foi possivel detectar campos automaticamente.',
        });
      }
    }

    setState(prev => ({ ...prev, documents: detectedDocs, currentStep: 2 }));
    setIsDetecting(false);

    if (detectedCount > 0) {
      toast.success(`${detectedCount} campo(s) detectado(s) automaticamente`);
    } else {
      toast.warning('Nenhum campo foi detectado', {
        description: 'Use o editor manual ou aplique um template salvo.',
      });
    }
  }, [isDetecting, state.documents, state.signature]);

  const handleGoToPosition = useCallback(() => {
    if (!state.signature) return;
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.status === 'waiting' ? { ...doc, status: 'review' as const } : doc
      ),
      currentStep: 2,
    }));
    setTimeout(() => {
      void detectSmartFields();
    }, 0);
  }, [detectSmartFields, state.signature]);

  const handleApplyPlacement = useCallback((placement: SignaturePlacement) => {
    if (!editingDocId) return;

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.id !== editingDocId) return doc;

        const current = getPlacements(doc);
        const nextPlacement = {
          ...placement,
          id: editingPlacementId || createId('manual'),
          source: 'manual' as const,
          type: placement.type || 'signature',
        };
        const next = editingPlacementId
          ? current.map(item => item.id === editingPlacementId ? nextPlacement : item)
          : [...current, nextPlacement];

        return withPlacements(doc, next, 'review');
      }),
    }));

    toast.success('Campo de assinatura atualizado');
    setEditingDocId(null);
    setEditingPlacementId(null);
  }, [editingDocId, editingPlacementId]);

  const handleApplyToAll = useCallback((placement: SignaturePlacement) => {
    const sharedPlacement = {
      ...placement,
      id: createId('manual-all'),
      source: 'manual' as const,
      type: placement.type || 'signature',
    };

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.status === 'error' || doc.status === 'signed') return doc;
        return withPlacements(doc, [sharedPlacement], 'review');
      }),
    }));

    toast.success('Posicao aplicada a todos os documentos');
    setEditingDocId(null);
    setEditingPlacementId(null);
  }, []);

  const handleEditDocument = useCallback((docId: string, placementId?: string) => {
    setEditingDocId(docId);
    setEditingPlacementId(placementId || null);
  }, []);

  const handleRemovePlacement = useCallback((docId: string, placementId: string) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.id !== docId) return doc;
        const next = getPlacements(doc).filter(placement => placement.id !== placementId);
        return withPlacements(doc, next, next.length ? 'review' : 'waiting');
      }),
    }));
  }, []);

  const handleAcceptSmartFields = useCallback((docId: string) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc =>
        doc.id === docId && doc.status === 'auto-found'
          ? { ...doc, status: 'review' as const }
          : doc
      ),
    }));
  }, []);

  const handleAddInitialsToAllPages = useCallback(async (docId?: string) => {
    setIsProcessing(true);
    try {
      const targetIds = docId ? [docId] : state.documents.map(doc => doc.id);
      const updated = await Promise.all(state.documents.map(async doc => {
        if (!targetIds.includes(doc.id) || doc.status === 'error' || doc.status === 'signed') return doc;

        const existing = getPlacements(doc).filter(placement => placement.type !== 'initials');
        const initials: SignaturePlacement[] = [];

        for (let pageIndex = 0; pageIndex < doc.pageCount; pageIndex++) {
          const size = await getPageDimensions(doc.file, pageIndex);
          initials.push({
            id: createId(`initials-${pageIndex}`),
            type: 'initials',
            source: 'initials',
            label: `Rubrica pagina ${pageIndex + 1}`,
            pageIndex,
            uiRect: {
              x: Math.max(24, size.width - 118),
              y: Math.max(24, size.height - 58),
              width: 86,
              height: 34,
            },
            viewportSize: size,
          });
        }

        return withPlacements(doc, [...existing, ...initials], 'review');
      }));

      setState(prev => ({ ...prev, documents: updated }));
      toast.success(docId ? 'Rubricas adicionadas ao documento' : 'Rubricas adicionadas a todos os documentos');
    } catch (error) {
      console.error('Erro ao adicionar rubricas:', error);
      toast.error('Nao foi possivel adicionar rubricas');
    } finally {
      setIsProcessing(false);
    }
  }, [state.documents]);

  const handleSaveTemplate = useCallback((doc: PdfDocument) => {
    const placements = getPlacements(doc);
    if (!placements.length) {
      toast.error('Este documento ainda nao tem campos para salvar');
      return;
    }

    const name = window.prompt('Nome do template de posicionamento:', doc.name.replace(/\.pdf$/i, ''));
    if (!name?.trim()) return;

    savePlacementTemplate(name.trim(), placements);
    setTemplates(getPlacementTemplates());
    toast.success('Template salvo localmente');
  }, []);

  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = templates.find(item => item.id === templateId);
    if (!template) return;

    setState(prev => ({
      ...prev,
      documents: prev.documents.map(doc => {
        if (doc.status === 'error' || doc.status === 'signed') return doc;
        const placements = cloneTemplatePlacements(template, doc.pageCount);
        return placements.length ? withPlacements(doc, placements, 'review') : doc;
      }),
    }));
    toast.success(`Template "${template.name}" aplicado`);
  }, [templates]);

  const handleSignDocument = useCallback(async (docId: string) => {
    if (!state.signature) return;
    const doc = state.documents.find(d => d.id === docId);
    const placements = doc ? getPlacements(doc) : [];

    if (!doc || !placements.length) {
      toast.error('Adicione ou confirme pelo menos um campo de assinatura');
      return;
    }

    setIsProcessing(true);

    try {
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d => d.id === docId ? { ...d, status: 'processing' as const } : d),
      }));

      const signedBlob = await signPdf(doc.file, state.signature, placements);
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d => d.id === docId ? { ...d, status: 'signed' as const, signedBlob } : d),
      }));
      toast.success(`${doc.name} assinado com sucesso`);
    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      setState(prev => ({
        ...prev,
        documents: prev.documents.map(d =>
          d.id === docId
            ? { ...d, status: 'error' as const, errorMessage: 'Erro ao assinar documento.' }
            : d
        ),
      }));
      toast.error('Erro ao assinar documento');
    } finally {
      setIsProcessing(false);
    }
  }, [state.documents, state.signature]);

  const handleSignAll = useCallback(async () => {
    if (!state.signature) return;
    const docsToSign = state.documents.filter(doc =>
      ['review', 'auto-found'].includes(doc.status) && getPlacements(doc).length > 0
    );

    if (!docsToSign.length) {
      toast.error('Nenhum documento pronto para assinar');
      return;
    }

    setIsProcessing(true);
    const updatedDocs = [...state.documents];
    let signedCount = 0;

    for (let i = 0; i < updatedDocs.length; i++) {
      const doc = updatedDocs[i];
      const placements = getPlacements(doc);
      if (!['review', 'auto-found'].includes(doc.status) || placements.length === 0) continue;

      try {
        updatedDocs[i] = { ...doc, status: 'processing' };
        setState(prev => ({ ...prev, documents: [...updatedDocs] }));

        const signedBlob = await signPdf(doc.file, state.signature, placements);
        updatedDocs[i] = { ...doc, status: 'signed', signedBlob };
        signedCount++;
      } catch (error) {
        console.error('Erro ao assinar documento:', error);
        updatedDocs[i] = { ...doc, status: 'error', errorMessage: 'Erro ao assinar documento.' };
      }
    }

    setState(prev => ({ ...prev, documents: updatedDocs, currentStep: 3 }));
    setIsProcessing(false);
    toast.success(`${signedCount} documento(s) assinado(s)`);
  }, [state.documents, state.signature]);

  const canGoNext = useCallback(() => {
    switch (state.currentStep) {
      case 0:
        return state.documents.some(d => d.status !== 'error');
      case 1:
        return !!state.signature;
      case 2:
        return state.documents.some(d => getPlacements(d).length > 0 && d.status !== 'error');
      default:
        return false;
    }
  }, [state.currentStep, state.documents, state.signature]);

  const goNext = useCallback(() => {
    if (state.currentStep === 1) {
      handleGoToPosition();
      return;
    }
    if (state.currentStep === 2) {
      void handleSignAll();
      return;
    }
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, [handleGoToPosition, handleSignAll, state.currentStep]);

  const goPrev = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const editingDoc = useMemo(() => {
    const doc = editingDocId ? state.documents.find(d => d.id === editingDocId) : null;
    if (!doc) return null;
    const placement = editingPlacementId
      ? getPlacements(doc).find(item => item.id === editingPlacementId)
      : undefined;
    return placement ? { ...doc, placement } : { ...doc, placement: undefined };
  }, [editingDocId, editingPlacementId, state.documents]);

  const docsWaiting = state.documents.filter(d => d.status !== 'error' && d.status !== 'signed' && getPlacements(d).length === 0);
  const docsReady = state.documents.filter(d => ['review', 'auto-found'].includes(d.status) && getPlacements(d).length > 0);
  const docsSigned = state.documents.filter(d => d.status === 'signed');

  return (
    <div className="min-h-screen bg-background">
      <OnboardingTutorial />
      <header className="border-b border-border bg-card">
        <div className="container max-w-5xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <PenLine className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">PDF Signer</h1>
                <p className="text-xs text-muted-foreground">Assinatura visual inteligente e local</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                    <Shield className="w-4 h-4" />
                    <span>Processamento local</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>PDFs e assinaturas sao processados no navegador.</TooltipContent>
              </Tooltip>
              <ThemeToggle />
            </div>
          </div>

          <StepIndicator
            steps={STEPS}
            currentStep={state.currentStep}
            onStepClick={(step) => {
              if (step < state.currentStep) setState(prev => ({ ...prev, currentStep: step }));
            }}
          />
        </div>
      </header>

      <main className="container max-w-5xl mx-auto py-8 px-4 pb-24">
        {state.currentStep === 0 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Adicione seus documentos</h2>
              <p className="text-muted-foreground">
                Selecione os PDFs que deseja assinar. Limite atual: {MAX_DOCUMENTS} arquivos.
              </p>
            </div>

            <PdfDropzone onFilesSelected={handleFilesSelected} maxFiles={MAX_DOCUMENTS} currentCount={state.documents.length} />
            <PdfList documents={state.documents} onRemove={handleRemoveDocument} />
          </div>
        )}

        {state.currentStep === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Defina sua assinatura</h2>
              <p className="text-muted-foreground">Desenhe, digite ou envie uma imagem da sua assinatura.</p>
              <div className="mt-3 p-3 bg-muted border border-border rounded-lg max-w-lg mx-auto">
                <p className="text-xs text-muted-foreground">
                  Esta e uma assinatura visual/grafica. Nao substitui assinatura digital certificada.
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
                  <SignaturePad onSignatureCreate={handleSignatureCreate} existingSignature={state.signature} />
                </TabsContent>
                <TabsContent value="type" className="mt-6">
                  <SignatureText onSignatureCreate={handleSignatureCreate} existingSignature={state.signature} />
                </TabsContent>
                <TabsContent value="upload" className="mt-6">
                  <SignatureUpload onSignatureUpload={handleSignatureCreate} existingSignature={state.signature} />
                </TabsContent>
              </Tabs>

              {state.signature && (
                <div className="mt-6 p-4 bg-card rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground mb-3">Previa da assinatura:</p>
                  <div className={`p-4 rounded-lg ${effectiveTheme === 'dark' ? 'bg-white' : 'bg-muted'}`}>
                    <img src={state.signature} alt="Assinatura" className="max-h-24 mx-auto object-contain" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {state.currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Campos inteligentes</h2>
                <p className="text-muted-foreground">
                  Revise os campos detectados automaticamente, ajuste manualmente quando necessario e assine em lote.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SmartFieldsConfig />
                <Button variant="outline" onClick={detectSmartFields} disabled={isDetecting || isProcessing}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {isDetecting ? 'Detectando...' : 'Detectar campos'}
                </Button>
                <Button variant="outline" onClick={() => void handleAddInitialsToAllPages()} disabled={isProcessing}>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Rubricar paginas
                </Button>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Templates locais</p>
                  <p className="text-xs text-muted-foreground">Reaplique layouts salvos para documentos do mesmo modelo.</p>
                </div>
                <Select onValueChange={handleApplyTemplate}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Aplicar template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {docsWaiting.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Sem campo confirmado ({docsWaiting.length})</h3>
                <div className="space-y-2">
                  {docsWaiting.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-card rounded-lg border border-border">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.pageCount} pagina(s)</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => handleEditDocument(doc.id)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar campo
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docsReady.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Prontos para revisar ou assinar ({docsReady.length})</h3>
                <div className="space-y-3">
                  {docsReady.map(doc => {
                    const placements = getPlacements(doc);
                    const isSmart = doc.status === 'auto-found';
                    return (
                      <div key={doc.id} className="bg-card rounded-lg border border-border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {isSmart ? <Sparkles className="w-5 h-5 text-success" /> : <Check className="w-5 h-5 text-primary" />}
                              <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{placementSummary(placements)}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isSmart && (
                              <Button size="sm" onClick={() => handleAcceptSmartFields(doc.id)}>
                                <BadgeCheck className="w-4 h-4 mr-2" />
                                Confirmar
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEditDocument(doc.id)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Novo campo
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void handleAddInitialsToAllPages(doc.id)}>
                              <Fingerprint className="w-4 h-4 mr-2" />
                              Rubricas
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleSaveTemplate(doc)}>
                              <Save className="w-4 h-4 mr-2" />
                              Template
                            </Button>
                            <Button size="sm" onClick={() => void handleSignDocument(doc.id)} disabled={isProcessing}>
                              Assinar
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {placements.map((placement, index) => (
                            <div key={placement.id || index} className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {placement.type === 'initials' ? 'Rubrica' : 'Assinatura'} - pagina {placement.pageIndex + 1}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {placement.source === 'smart' ? `Detectado: ${placement.anchorText || placement.label}` : placement.source || 'manual'}
                                  {placement.confidence ? ` (${placement.confidence}% confianca)` : ''}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => handleEditDocument(doc.id, placement.id)}>
                                  <PenLine className="w-4 h-4" />
                                </Button>
                                {placement.id && (
                                  <Button variant="ghost" size="icon" onClick={() => handleRemovePlacement(doc.id, placement.id!)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {docsSigned.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">Ja assinados ({docsSigned.length})</h3>
                <div className="space-y-2">
                  {docsSigned.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-success" />
                        <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {docsReady.length > 0 && (
              <div className="text-center">
                <Button size="lg" onClick={() => void handleSignAll()} disabled={isProcessing || isDetecting}>
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Assinando...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Assinar documentos prontos
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {state.currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Exportar documentos</h2>
              <p className="text-muted-foreground">Baixe os PDFs assinados individualmente ou em ZIP.</p>
            </div>
            <div className="max-w-2xl mx-auto">
              <ExportPanel documents={state.documents} />
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto py-4 px-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goPrev} disabled={state.currentStep === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="w-4 h-4" />
            <span>{state.documents.length} documento(s)</span>
          </div>

          {state.currentStep < 3 ? (
            <Button onClick={goNext} disabled={!canGoNext() || isProcessing || isDetecting}>
              {state.currentStep === 2 ? 'Assinar e exportar' : 'Proximo'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setState({
                  documents: [],
                  signature: null,
                  initialsSignature: null,
                  currentStep: 0,
                  maxDocuments: MAX_DOCUMENTS,
                });
              }}
            >
              Novo lote
            </Button>
          )}
        </div>
      </footer>

      {editingDoc && state.signature && (
        <ManualEditor
          document={editingDoc}
          signature={state.signature}
          onApply={handleApplyPlacement}
          onApplyToAll={handleApplyToAll}
          onCancel={() => {
            setEditingDocId(null);
            setEditingPlacementId(null);
          }}
        />
      )}
    </div>
  );
};

export default Index;
