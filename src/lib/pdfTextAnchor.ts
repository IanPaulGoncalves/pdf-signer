import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { AnchorMatch, SignaturePlacement } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const DEFAULT_KEYWORDS = [
  'assinatura',
  'assinaturas',
  'assine aqui',
  'assinar',
  'assinado por',
  'responsavel',
  'responsável',
  'testemunha',
  'declarante',
  'contratante',
  'contratado',
  'locador',
  'locatario',
  'locatário',
  'representante',
  'procurador',
  'de acordo',
  'aprovado por',
  'signature',
  'sign here',
  'signed by',
  'authorized by',
  'approved by',
  '_____',
];

const HIGH_PRIORITY_KEYWORDS = [
  'assinatura:',
  'assinaturas:',
  'assine aqui',
  'sign here',
  'signature:',
  'signed by',
  '_____',
];

const FALSE_POSITIVE_KEYWORDS = [
  'contratante:',
  'contratada:',
  'contratado:',
  'locador:',
  'locatario:',
  'locatário:',
];

const CUSTOM_KEYWORDS_KEY = 'pdf-signer-custom-keywords';

export function getCustomKeywords(): string[] {
  try {
    const stored = localStorage.getItem(CUSTOM_KEYWORDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveCustomKeywords(keywords: string[]): void {
  try {
    localStorage.setItem(CUSTOM_KEYWORDS_KEY, JSON.stringify(keywords));
  } catch (error) {
    console.error('Falha ao salvar palavras-chave personalizadas:', error);
  }
}

export function getAllKeywords(): string[] {
  return Array.from(new Set([...DEFAULT_KEYWORDS, ...getCustomKeywords()].map(k => k.toLowerCase())));
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function calculateFieldScore(
  text: string,
  keyword: string,
  pageIndex: number,
  totalPages: number,
  nearbyText: string[]
): number {
  const normalizedText = normalizeText(text);
  const normalizedKeyword = normalizeText(keyword);
  let score = 0;

  if (FALSE_POSITIVE_KEYWORDS.some(fp => normalizedText.includes(normalizeText(fp)))) {
    score -= 35;
  }

  if (HIGH_PRIORITY_KEYWORDS.some(k => normalizedText.includes(normalizeText(k)))) {
    score += 55;
  }

  if (normalizedText === normalizedKeyword) {
    score += 25;
  } else if (normalizedText.includes(normalizedKeyword)) {
    score += 15;
  }

  const pagePosition = (pageIndex + 1) / totalPages;
  score += pagePosition * 30;

  if (pageIndex >= totalPages - 2) {
    score += 20;
  }

  const hasLineNearby = nearbyText.some(t => t.includes('___'));
  if (hasLineNearby || normalizedText.includes('___')) {
    score += 45;
  }

  const hasSignatureSection = nearbyText.some(t => {
    const normalized = normalizeText(t);
    return normalized.includes('assinatura') || normalized.includes('signature');
  });
  if (hasSignatureSection) {
    score += 30;
  }

  if (normalizedText.length > 80) {
    score -= 25;
  }

  return score;
}

function createPageIndexes(totalPages: number, maxPages: number): number[] {
  const indexes = new Set<number>();
  const lastPagesStart = Math.max(0, totalPages - maxPages);

  for (let i = lastPagesStart; i < totalPages; i++) {
    indexes.add(i);
  }

  // Check the first page too because many forms have a signature field there.
  indexes.add(0);
  return Array.from(indexes).sort((a, b) => a - b);
}

function dedupeMatches(matches: AnchorMatch[]): AnchorMatch[] {
  const seen = new Set<string>();
  return matches.filter(match => {
    const key = `${match.pageIndex}:${Math.round(match.x / 8)}:${Math.round(match.y / 8)}:${normalizeText(match.text)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function findAllSignatureAnchors(
  file: File,
  maxPages: number = 8
): Promise<AnchorMatch[]> {
  const matches: AnchorMatch[] = [];

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const keywords = getAllKeywords();
    const pageIndexes = createPageIndexes(pdf.numPages, maxPages);

    for (const pageIndex of pageIndexes) {
      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1 });
      const textContent = await page.getTextContent();
      const textItems = textContent.items.filter(item => 'str' in item);
      const allText = textItems.map((item: any) => item.str || '');

      for (let i = 0; i < textItems.length; i++) {
        const item = textItems[i] as any;
        const rawText = String(item.str || '').trim();
        const text = normalizeText(rawText);
        if (!text || text.length < 2) continue;

        const matchedKeyword = keywords.find(keyword => {
          const normalizedKeyword = normalizeText(keyword);
          return text.includes(normalizedKeyword) || (normalizedKeyword.includes('___') && text.includes('___'));
        });

        if (!matchedKeyword) continue;

        const nearbyText = allText.slice(Math.max(0, i - 6), Math.min(allText.length, i + 7));
        const transform = item.transform || [1, 0, 0, 1, 80, 80];
        const itemX = Number(transform[4]) || 80;
        const itemY = viewport.height - (Number(transform[5]) || 80);
        const isLine = rawText.includes('___') || matchedKeyword.includes('___');
        const score = calculateFieldScore(rawText, matchedKeyword, pageIndex, pdf.numPages, nearbyText);

        const x = Math.max(32, Math.min(itemX, viewport.width - 220));
        const yOffset = isLine ? -58 : 16;
        const y = Math.max(32, Math.min(itemY + yOffset, viewport.height - 96));
        const confidence = Math.max(0, Math.min(100, Math.round(score)));

        if (confidence < 35) continue;

        matches.push({
          text: rawText,
          pageIndex,
          x,
          y,
          width: Math.max(Number(item.width) || 180, 180),
          height: Math.max(Number(item.height) || 18, 18),
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          score,
          confidence,
        });
      }
    }

    return dedupeMatches(matches).sort((a, b) => (b.score || 0) - (a.score || 0));
  } catch (error) {
    console.error('Erro ao detectar campos de assinatura:', error);
    return [];
  }
}

export async function findSignatureAnchor(
  file: File,
  maxPages: number = 8
): Promise<AnchorMatch | null> {
  const matches = await findAllSignatureAnchors(file, maxPages);
  return matches[0] || null;
}

export function calculateSignaturePlacement(
  anchor: AnchorMatch,
  signatureWidth: number = 200,
  signatureHeight: number = 80
): SignaturePlacement {
  return {
    id: `smart-${anchor.pageIndex}-${Math.round(anchor.x)}-${Math.round(anchor.y)}`,
    type: 'signature',
    source: 'smart',
    label: anchor.text || 'Campo detectado',
    anchorText: anchor.text,
    confidence: anchor.confidence,
    pageIndex: anchor.pageIndex,
    uiRect: {
      x: Math.max(0, anchor.x),
      y: Math.max(0, anchor.y),
      width: signatureWidth,
      height: signatureHeight,
    },
    viewportSize: {
      width: anchor.viewportWidth || 612,
      height: anchor.viewportHeight || 792,
    },
  };
}
