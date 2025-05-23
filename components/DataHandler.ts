import { getDataArray, setDataArray } from "../lib/dataUtils";


export function sortData(cells: Record<string, string>, maxRows: number, maxCols: number, columnIndex: number, order: 'asc' | 'desc') {
  const data = getDataArray(cells, maxRows, maxCols);
  data.sort((a, b) => {
    const aValue = a[columnIndex] || '';
    const bValue = b[columnIndex] || '';
    const aNum = parseFloat(aValue);
    const bNum = parseFloat(bValue);
    const aIsNum = !isNaN(aNum);
    const bIsNum = !isNaN(bNum);
    if (aIsNum && bIsNum) {
      return order === 'asc' ? aNum - bNum : bNum - aNum;
    } else if (aIsNum) return order === 'asc' ? -1 : 1;
    else if (bIsNum) return order === 'asc' ? 1 : -1;
    else return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
  });
  setDataArray(cells, data);
}

export function getFilteredRowIndices(cells: Record<string, string>, maxRows: number, filters: Record<number, string>) {
  return Array.from({ length: maxRows }, (_, i) => i).filter(rowIndex =>
    Object.entries(filters).every(([colIndex, filterValue]) => {
      const cellValue = cells[`${rowIndex},${colIndex}`] || '';
      return cellValue.toLowerCase().includes(filterValue.toLowerCase());
    })
  );
}

export function getGroupedItems(cells: Record<string, string>, filteredIndices: number[], groupingColumn: number | null) {
  if (groupingColumn === null) {
    return filteredIndices.map(rowIndex => ({ type: 'row' as const, rowIndex }));
  }
  const groups: Record<string, number[]> = {};
  filteredIndices.forEach(rowIndex => {
    const groupValue = cells[`${rowIndex},${groupingColumn}`] || '';
    if (!groups[groupValue]) groups[groupValue] = [];
    groups[groupValue].push(rowIndex);
  });
  const groupedItems: ({ type: 'group'; value: string } | { type: 'row'; rowIndex: number })[] = [];
  Object.entries(groups).forEach(([value, rowIndices]) => {
    groupedItems.push({ type: 'group', value });
    rowIndices.forEach(rowIndex => groupedItems.push({ type: 'row', rowIndex }));
  });
  return groupedItems;
}