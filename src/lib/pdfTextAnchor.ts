import * as pdfjsLib from 'pdfjs-dist';
import type { AnchorMatch } from '../types';

// Configure PDF.js worker - Use CDN with https
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// Default keywords to search for signature fields - More comprehensive list
const DEFAULT_KEYWORDS = [
  // Portuguese - Common
  'assinatura',
  'assinar',
  'assinado',
  'assine',
  'responsável',
  'testemunha',
  'declarante',
  'contratante',
  'contratado',
  'locador',
  'locatário',
  'signatário',
  'de acordo',

  // Portuguese - Roles
  'diretor',
  'gerente',
  'coordenador',
  'supervisor',
  'representante',
  'procurador',

  // Portuguese - Actions
  'autorizado',
  'aprovado',
  'validado',
  'confirmado',

  // Common signature lines
  '___________________',
  '__________________',
  '_________________',
  '________________',
  '______',
  '_____',

  // English
  'signature',
  'sign here',
  'signed by',
  'authorized by',
  'approved by',
  'signed',
  'signer',
  'authorized',
  'approved',
];

// Storage key for custom keywords
const CUSTOM_KEYWORDS_KEY = 'pdf-signer-custom-keywords';

// Get custom keywords from localStorage
export function getCustomKeywords(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_KEYWORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save custom keywords to localStorage
export function saveCustomKeywords(keywords: string[]): void {
  try {
    localStorage.setItem(CUSTOM_KEYWORDS_KEY, JSON.stringify(keywords));
  } catch (error) {
    console.error('Failed to save custom keywords:', error);
  }
}

// Get all keywords (default + custom)
export function getAllKeywords(): string[] {
  const custom = getCustomKeywords();
  return [...DEFAULT_KEYWORDS, ...custom];
}

// High-priority keywords that strongly indicate signature fields
const HIGH_PRIORITY_KEYWORDS = [
  'assinaturas:',
  'assinatura:',
  'assine aqui',
  'sign here',
  'signature:',
  'signatures:',
  '___________________', // Signature lines
  '__________________',
  '_________________',
];

// Keywords that often appear in contracts but are NOT signature fields
const FALSE_POSITIVE_KEYWORDS = [
  'contratada:',
  'contratante:',
  'contratado:',
  'locador:',
  'locatário:',
];

// Calculate relevance score for a potential signature field
function calculateFieldScore(
  text: string,
  keyword: string,
  pageIndex: number,
  totalPages: number,
  nearbyText: string[]
): number {
  let score = 0;

  const textLower = text.toLowerCase().trim();

  // Penalize false positives heavily
  if (FALSE_POSITIVE_KEYWORDS.some(fp => textLower.includes(fp))) {
    score -= 50;
  }

  // Higher score for matches on last pages (signatures usually at end)
  const pageScore = (pageIndex + 1) / totalPages;
  score += pageScore * 35;

  // Bonus for last 2 pages
  if (pageIndex >= totalPages - 2) {
    score += 20;
  }

  // Higher score for high-priority keywords
  if (HIGH_PRIORITY_KEYWORDS.includes(keyword.toLowerCase())) {
    score += 60;
  }

  // Higher score if near signature lines (underscores)
  const hasSignatureLine = nearbyText.some(t => t.includes('____') || t.includes('___'));
  if (hasSignatureLine) {
    score += 45;
  }

  // Higher score if in a section labeled "ASSINATURAS" or similar
  const inSignatureSection = nearbyText.some(t => {
    const tl = t.toLowerCase();
    return tl.includes('assinaturas') ||
      tl.includes('signatures') ||
      tl === 'assinaturas:' ||
      tl === 'signatures:';
  });
  if (inSignatureSection) {
    score += 50;
  }

  // Exact match gets higher score (but not for false positives)
  if (textLower === keyword.toLowerCase() && !FALSE_POSITIVE_KEYWORDS.includes(textLower)) {
    score += 25;
  }

  // Lower score for fields in the middle of sentences
  if (text.includes(':') && !text.endsWith(':') && textLower !== 'assinaturas:') {
    score -= 30;
  }

  // Bonus if the text itself is "ASSINATURAS:" or similar section headers
  if (textLower === 'assinaturas:' || textLower === 'assinatura:' || textLower === 'signatures:') {
    score += 40;
  }

  return score;
}

// Extract text from PDF and find ALL potential signature anchors
export async function findAllSignatureAnchors(
  file: File,
  maxPages: number = 8
): Promise<AnchorMatch[]> {
  const matches: (AnchorMatch & { score: number })[] = [];

  try {
    console.log('[SmartFields] Finding all potential signature fields for:', file.name);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pagesToCheck = Math.min(pdf.numPages, maxPages);
    const keywords = getAllKeywords();

    console.log(`[SmartFields] Checking ${pagesToCheck} pages with ${keywords.length} keywords`);

    // Search all pages
    for (let i = 0; i < pagesToCheck; i++) {
      const page = await pdf.getPage(i + 1);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const textItems = textContent.items.filter(item => 'str' in item);

      // Get nearby text for context
      const allText = textItems.map((item: any) => item.str.toLowerCase());

      console.log(`[SmartFields] Page ${i + 1}: Found ${textItems.length} text items`);

      for (let j = 0; j < textItems.length; j++) {
        const item = textItems[j] as any;
        const text = item.str.toLowerCase().trim();

        if (!text || text.length < 2) continue;

        // Get nearby text (5 items before and after)
        const nearbyText = allText.slice(Math.max(0, j - 5), Math.min(allText.length, j + 6));

        for (const keyword of keywords) {
          const keywordLower = keyword.toLowerCase();

          if (text === keywordLower || text.includes(keywordLower)) {
            const transform = item.transform;
            let x = transform[4];
            let y = viewport.height - transform[5];

            const isSignatureLine = keyword.includes('_');
            if (!isSignatureLine) {
              y = y + (item.height || 20);
            }

            x = Math.max(50, Math.min(x, viewport.width - 250));
            y = Math.max(50, Math.min(y, viewport.height - 130));

            const score = calculateFieldScore(text, keyword, i, pdf.numPages, nearbyText);

            matches.push({
              text: item.str,
              pageIndex: i,
              x: x,
              y: y,
              width: item.width || 200,
              height: item.height || 20,
              score: score,
            });

            console.log(`[SmartFields] Found potential field: "${item.str}" on page ${i + 1}, score: ${score.toFixed(1)}`);
          }
        }
      }
    }

    // Sort by score (highest first)
    matches.sort((a, b) => b.score - a.score);

    console.log(`[SmartFields] Found ${matches.length} potential fields, best score: ${matches[0]?.score.toFixed(1)}`);

    return matches;
  } catch (error) {
    console.error('[SmartFields] Error finding signature anchors:', error);
    return [];
  }
}

// Extract text from PDF and find the BEST signature anchor
export async function findSignatureAnchor(
  file: File,
  maxPages: number = 8
): Promise<AnchorMatch | null> {
  const allMatches = await findAllSignatureAnchors(file, maxPages);

  if (allMatches.length === 0) {
    console.log('[SmartFields] No signature field found');
    return null;
  }

  // Return the best match (highest score)
  const best = allMatches[0];
  console.log(`[SmartFields] ✓ Best match: "${best.text}" on page ${best.pageIndex + 1}, score: ${(best as any).score.toFixed(1)}`);

  // Remove score before returning
  const { score, ...match } = best as any;
  return match;
}

export function calculateSignaturePlacement(
  anchor: AnchorMatch,
  signatureWidth: number = 200,
  signatureHeight: number = 80,
  offsetY: number = 15
): { x: number; y: number; width: number; height: number } {
  // Calculate optimal position based on anchor
  const x = anchor.x;
  const y = anchor.y + offsetY; // Already adjusted in findSignatureAnchor

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: signatureWidth,
    height: signatureHeight,
  };
}
