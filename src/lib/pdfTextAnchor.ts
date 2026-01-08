import type { AnchorMatch } from '../types';

// Without pdfjs-dist, we can't extract text. All documents go to manual review.
export async function findSignatureAnchor(
  _file: File,
  _maxPages: number = 8
): Promise<AnchorMatch | null> {
  // Return null to trigger manual review
  return null;
}

export function calculateSignaturePlacement(
  anchor: AnchorMatch,
  signatureWidth: number = 200,
  signatureHeight: number = 80,
  offsetY: number = 10
): { x: number; y: number; width: number; height: number } {
  return {
    x: anchor.x,
    y: anchor.y + anchor.height + offsetY,
    width: signatureWidth,
    height: signatureHeight,
  };
}
