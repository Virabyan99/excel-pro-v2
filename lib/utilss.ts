export function parseCellReference(ref: string): { row: number; col: number } | null {
  const match = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;
  const [, colStr, rowStr] = match;
  const col = colStr.toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(rowStr, 10) - 1;
  return { row, col };
}

export function extractCellReferences(formula: string): string[] {
  const regex = /([A-Z]+\d+)/gi;
  const matches = formula.match(regex);
  return matches ? matches.map(m => m.toUpperCase()) : [];
}