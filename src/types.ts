export type DocumentStatus = 
  | 'waiting' 
  | 'processing' 
  | 'auto-found' 
  | 'review' 
  | 'signed' 
  | 'error';

export type PlacementType = 'signature' | 'initials';
export type PlacementSource = 'manual' | 'smart' | 'template' | 'initials';

export interface SignaturePlacement {
  id?: string;
  type?: PlacementType;
  label?: string;
  source?: PlacementSource;
  confidence?: number;
  anchorText?: string;
  pageIndex: number;
  uiRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  viewportSize: {
    width: number;
    height: number;
  };
  pdfRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PdfDocument {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  status: DocumentStatus;
  errorMessage?: string;
  placement?: SignaturePlacement;
  placements?: SignaturePlacement[];
  signedBlob?: Blob;
}

export interface AnchorMatch {
  text: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth?: number;
  viewportHeight?: number;
  score?: number;
  confidence?: number;
}

export interface AppState {
  documents: PdfDocument[];
  signature: string | null; // base64 data URL
  initialsSignature?: string | null;
  currentStep: number;
  maxDocuments: number;
}
