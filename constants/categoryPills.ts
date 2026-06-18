/** Pills pastéis no estilo tags do Notion. */
export const CATEGORY_PILLS: Record<string, { bg: string; text: string }> = {
  adulto: { bg: '#D3E5EF', text: '#28456A' },
  infantil: { bg: '#FAECEC', text: '#6E3630' },
  cat_adulto: { bg: '#D3E5EF', text: '#28456A' },
  cat_infantil: { bg: '#FAECEC', text: '#6E3630' },
};

const DEFAULT_PILL = { bg: '#E9E9E7', text: '#37352F' };

export function getCategoryPillStyle(slug?: string, label?: string): { bg: string; text: string } {
  if (slug && CATEGORY_PILLS[slug]) return CATEGORY_PILLS[slug];
  const key = label?.toLowerCase();
  if (key && CATEGORY_PILLS[key]) return CATEGORY_PILLS[key];
  return DEFAULT_PILL;
}

export const CATEGORY_ID_LABELS: Record<string, string> = {
  cat_adulto: 'Adulto',
  cat_infantil: 'Infantil',
};

export function labelsFromCategoryIds(ids: string[] = []): { labels: string[]; slugs: string[] } {
  const labels: string[] = [];
  const slugs: string[] = [];
  for (const id of ids) {
    const label = CATEGORY_ID_LABELS[id] ?? id;
    labels.push(label);
    slugs.push(id.replace('cat_', '') || id);
  }
  return { labels, slugs };
}
