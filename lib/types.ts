// lib/types.ts
export type CellMap = Record<string, string>

export type Sheet = {
  name: string
  cells: CellMap
  formulas: Record<string, string>
  maxRows: number
  maxCols: number
  focusedCell: { row: number; col: number } | null
  selectionStart: { row: number; col: number } | null
  selectionEnd: { row: number; col: number } | null
  isSelecting: boolean
  isChartOpen: boolean
  sortColumn: number | null
  sortOrder: 'asc' | 'desc' | null
  filters: Record<number, string>
  groupingColumn: number | null
  columnWidths: number[]
  rowHeights: number[]
  columnOrder: number[]
}

export type Document = {
  sheets: Sheet[]
  activeSheetIndex: number
}

export const defaultDocument: Document = {
  sheets: [{
    name: 'Sheet1',
    cells: {},
    formulas: {},
    maxRows: 22,
    maxCols: 14,
    focusedCell: null,
    selectionStart: null,
    selectionEnd: null,
    isSelecting: false,
    isChartOpen: false,
    sortColumn: null,
    sortOrder: null,
    filters: {},
    groupingColumn: null,
    columnWidths: Array(15).fill(126),
    rowHeights: Array(23).fill(34),
    columnOrder: Array.from({ length: 15 }, (_, i) => i),
  }],
  activeSheetIndex: 0,
}