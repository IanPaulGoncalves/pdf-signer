export type DocumentStatus = 
  | 'waiting' 
  | 'processing' 
  | 'auto-found' 
  | 'review' 
  | 'signed' 
  | 'error';

export interface SignaturePlacement {
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
  signedBlob?: Blob;
}

export interface AnchorMatch {
  text: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppState {
  documents: PdfDocument[];
  signature: string | null; // base64 data URL
  currentStep: number;
  maxDocuments: number;
}
