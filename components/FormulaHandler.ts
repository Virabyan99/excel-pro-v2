import { extractCellReferences, parseCellReference } from '@/lib/utilss';
import { evaluate } from 'mathjs';

export function calculateFormulas(cells: Record<string, string>, formulas: Record<string, string>): Record<string, string> {
  const newCells = { ...cells };
  Object.entries(formulas).forEach(([key, formula]) => {
    const sumMatch = formula.match(/^=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
    if (sumMatch) {
      const [, startCol, startRow, endCol, endRow] = sumMatch;
      const colStart = startCol.toUpperCase().charCodeAt(0) - 65;
      const rowStart = parseInt(startRow, 10) - 1;
      const colEnd = endCol.toUpperCase().charCodeAt(0) - 65;
      const rowEnd = parseInt(endRow, 10) - 1;
      let sum = 0;
      for (let r = rowStart; r <= rowEnd; r++) {
        for (let c = colStart; c <= colEnd; c++) {
          const cellKey = `${r},${c}`;
          const raw = cells[cellKey] || '0';
          const num = parseFloat(raw);
          sum += isNaN(num) ? 0 : num;
        }
      }
      newCells[key] = String(sum);
    } else {
      const refs = extractCellReferences(formula);
      const scope: Record<string, number> = {};
      refs.forEach(ref => {
        const pos = parseCellReference(ref);
        if (pos) {
          const cellKey = `${pos.row},${pos.col}`;
          const raw = cells[cellKey] || '0';
          const num = parseFloat(raw);
          scope[ref.toUpperCase()] = isNaN(num) ? 0 : num;
        }
      });
      try {
        const expr = formula.slice(1);
        const result = evaluate(expr, scope);
        newCells[key] = String(result);
      } catch {
        newCells[key] = '#ERROR';
      }
    }
  });
  return newCells;
}