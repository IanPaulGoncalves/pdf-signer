import type { SignaturePlacement } from '@/types';

export interface PlacementTemplate {
  id: string;
  name: string;
  createdAt: string;
  placements: SignaturePlacement[];
}

const STORAGE_KEY = 'pdf-signer-placement-templates';

export function getPlacementTemplates(): PlacementTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function savePlacementTemplate(name: string, placements: SignaturePlacement[]): PlacementTemplate {
  const template: PlacementTemplate = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: new Date().toISOString(),
    placements: placements.map((placement, index) => ({
      ...placement,
      id: `template-${index}`,
      source: 'template',
    })),
  };

  const templates = [template, ...getPlacementTemplates()].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return template;
}

export function deletePlacementTemplate(id: string): void {
  const templates = getPlacementTemplates().filter(template => template.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function cloneTemplatePlacements(template: PlacementTemplate, pageCount: number): SignaturePlacement[] {
  return template.placements
    .filter(placement => placement.pageIndex < pageCount)
    .map((placement, index) => ({
      ...placement,
      id: `template-${template.id}-${index}`,
      source: 'template',
    }));
}
