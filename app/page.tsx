"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Papa from 'papaparse';
import { z } from 'zod';
import { evaluate } from 'mathjs';
import dynamic from "next/dynamic";
import { Header } from '@/components/Header';

const ChartModal = dynamic(
  () => import("@/components/ChartModal").then((mod) => mod.ChartModal),
  { ssr: false }
);

type CellMap = Record<string, string>;
export default function Home() {
  const [cells, setCells] = useState<CellMap>({});
  const [formulas, setFormulas] = useState<Record<string, string>>({});
  const [maxRows, setMaxRows] = useState(22);
  const [maxCols, setMaxCols] = useState(14);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  // Sorting state
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  // Filtering state
  const [filters, setFilters] = useState<Record<number, string>>({});
  // Grouping state
  const [groupingColumn, setGroupingColumn] = useState<number | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);

  const HEADER_HEIGHT = 34;
  const ROW_HEADER_WIDTH = 126;


  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);


  const applyFilter = (column: number, value: string) => {
    setFilters(prev => {
      if (value.trim() === '') {
        const { [column]: _, ...rest } = prev;
        return rest;
      } else {
        return { ...prev, [column]: value };
      }
    });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, rawValue: string) => {
    const key = `${rowIndex},${colIndex}`;
    if (rawValue.startsWith('=')) {
      setFormulas(prev => ({ ...prev, [key]: rawValue }));
      setCells(prev => ({ ...prev, [key]: rawValue }));
    } else {
      setFormulas(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setCells(prev => {
        const next = { ...prev };
        if (rawValue.trim() === '') {
          delete next[key];
        } else {
          next[key] = rawValue;
        }
        return next;
      });
    }
    setMaxRows(prev => (rowIndex >= prev - 2 ? prev + 10 : prev));
    setMaxCols(prev => (colIndex >= prev - 2 ? prev + 10 : prev));
  };

  const parseCellReference = (ref: string): { row: number; col: number } | null => {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const [, colStr, rowStr] = match;
    const col = colStr.toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(rowStr, 10) - 1;
    return { row, col };
  };

  const extractCellReferences = (formula: string): string[] => {
    const regex = /([A-Z]+\d+)/gi;
    const matches = formula.match(regex);
    return matches ? matches.map(m => m.toUpperCase()) : [];
  };

  const calculateFormulas = (currentCells: CellMap, currentFormulas: Record<string, string>): CellMap => {
    const newCells = { ...currentCells };
    Object.entries(currentFormulas).forEach(([key, formula]) => {
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
            const raw = currentCells[cellKey] || '0';
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
            const raw = currentCells[cellKey] || '0';
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
  };

  useEffect(() => {
    if (isUpdating.current) {
      isUpdating.current = false;
      return;
    }
    const newCells = calculateFormulas(cells, formulas);
    if (JSON.stringify(newCells) !== JSON.stringify(cells)) {
      isUpdating.current = true;
      setCells(newCells);
    }
  }, [cells, formulas]);

  // Utility functions for data manipulation
  const getDataArray = () => {
    const data: string[][] = Array.from({ length: maxRows }, () => Array(maxCols).fill(''));
    Object.entries(cells).forEach(([key, value]) => {
      const [row, col] = key.split(',').map(Number);
      if (row < maxRows && col < maxCols) {
        data[row][col] = value;
      }
    });
    return data;
  };

  const setDataArray = (data: string[][]) => {
    const newCells: CellMap = {};
    data.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell !== '') {
          newCells[`${rowIndex},${colIndex}`] = cell;
        }
      });
    });
    setCells(newCells);
  };

  // Sorting logic
  const sortData = (columnIndex: number, order: 'asc' | 'desc') => {
    const data = getDataArray();
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
    setDataArray(data);
  };

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
        sortData(columnIndex, 'desc');
      } else if (sortOrder === 'desc') {
        setSortColumn(null);
        setSortOrder(null);
        // No reset to original order for simplicity
      } else {
        setSortOrder('asc');
        sortData(columnIndex, 'asc');
      }
    } else {
      setSortColumn(columnIndex);
      setSortOrder('asc');
      sortData(columnIndex, 'asc');
    }
  };

  // Filtering logic
  const getFilteredRowIndices = () => {
    return Array.from({ length: maxRows }, (_, i) => i).filter(rowIndex => {
      return Object.entries(filters).every(([colIndex, filterValue]) => {
        const cellValue = cells[`${rowIndex},${colIndex}`] || '';
        return cellValue.toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  };

  // Grouping logic
  const getGroupedItems = () => {
    const filteredIndices = getFilteredRowIndices();
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
  };

  const items = getGroupedItems();
  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: maxCols,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 126,
    overscan: 5,
  });

  const exportToCSV = () => {
    const data = Array.from({ length: maxRows }, (_, row) =>
      Array.from({ length: maxCols }, (_, col) => cells[`${row},${col}`] || '')
    );
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sheet.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<string[]>(file, {
      complete: (results) => {
        try {
          const raw = results.data as string[][];
          const sheet = z.array(z.array(z.string())).parse(raw);
          const cols = sheet[0]?.length ?? 0;
          const newCells: CellMap = {};
          sheet.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
              z.string().parse(cell);
              if (cell.trim() !== '') {
                newCells[`${rowIndex},${colIndex}`] = cell;
              }
            });
          });
          setCells(newCells);
          setMaxRows(sheet.length + 2);
          setMaxCols(cols + 2);
        } catch (err: any) {
          alert(`Import failed: ${err.message}`);
        }
      },
      error: (err) => {
        alert(`Parsing error: ${err.message}`);
      },
    });
    e.target.value = '';
  };

  function getSelectedData() {
    if (!selectionStart || !selectionEnd) return { rowLabels: [], colLabels: [], data: [] };
    const rowMin = Math.min(selectionStart.row, selectionEnd.row);
    const rowMax = Math.max(selectionStart.row, selectionEnd.row);
    const colMin = Math.min(selectionStart.col, selectionEnd.col);
    const colMax = Math.max(selectionStart.col, selectionEnd.col);
    const rowLabels = Array.from({ length: rowMax - rowMin + 1 }, (_, i) => String(rowMin + i + 1));
    const colLabels = Array.from({ length: colMax - colMin + 1 }, (_, j) => String.fromCharCode(65 + colMin + j));
    const data = rowLabels.map((_, i) =>
      colLabels.map((_, j) => {
        const key = `${rowMin + i},${colMin + j}`;
        const raw = cells[key] || '';
        const num = parseFloat(raw);
        return isNaN(num) ? 0 : num;
      })
    );
    return { rowLabels, colLabels, data };
  }

return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header
        onImport={handleImportCSV}
        onExport={exportToCSV}
        maxCols={maxCols}
        setGroupingColumn={setGroupingColumn}
        groupingColumn={groupingColumn}
        applyFilter={applyFilter}
      />
      <div className="flex-1 relative mt-13 overflow-hidden">
        {selectionStart && selectionEnd && (
          <button
            onClick={() => setIsChartOpen(true)}
            className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-blue-600 text-white rounded"
          >
            Visualize
          </button>
        )}
        {isChartOpen && (
          <ChartModal
            rowLabels={getSelectedData().rowLabels}
            colLabels={getSelectedData().colLabels}
            data={getSelectedData().data}
            onClose={() => setIsChartOpen(false)}
          />
        )}
        {/* Column Headers with Sorting Only */}
        <div className="absolute top-0 left-[126px] right-0 h-[34px] bg-gray-100">
          {columnVirtualizer.getVirtualItems().map((cv) => (
            <div
              key={cv.index}
              className="absolute flex items-center justify-center font-bold border border-gray-300 cursor-pointer"
              style={{
                top: 0,
                left: cv.start,
                width: cv.size,
                height: 34,
                boxSizing: 'border-box',
              }}
              onClick={() => handleSort(cv.index)}
            >
              {String.fromCharCode(65 + cv.index)}
              {sortColumn === cv.index && (
                <span>{sortOrder === 'asc' ? ' 🔼' : ' 🔽'}</span>
              )}
            </div>
          ))}
        </div>
        {/* Row Headers */}
        <div
          className="absolute left-0 top-[34px] bottom-0 w-[126px] bg-gray-100"
          style={{ pointerEvents: 'none' }}
        >
          {rowVirtualizer.getVirtualItems().map((rv) => {
            const item = items[rv.index];
            return (
              <div
                key={rv.index}
                className="absolute flex items-center justify-center font-bold border border-gray-300"
                style={{
                  top: rv.start,
                  left: 0,
                  width: 126,
                  height: rv.size,
                  boxSizing: 'border-box',
                }}
              >
                {item.type === 'row' ? item.rowIndex + 1 : ''}
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div
          ref={parentRef}
          className="absolute overflow-auto"
          style={{ top: 34, left: 126, right: 0, bottom: 0 }}
        >
          <div
            style={{
              width: columnVirtualizer.getTotalSize(),
              height: rowVirtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((rv) => {
              const item = items[rv.index];
              if (item.type === 'group') {
                return (
                  <div
                    key={`group-${rv.index}`}
                    className="absolute w-full h-[34px] bg-gray-200 flex items-center justify-start p-2 font-bold"
                    style={{ top: rv.start, left: 0 }}
                  >
                    {item.value || '(Empty)'}
                  </div>
                );
              }
              const rowIndex = item.rowIndex;
              return columnVirtualizer.getVirtualItems().map((cv) => {
                const colIndex = cv.index;
                const key = `${rowIndex},${colIndex}`;
                const isFocused = focusedCell?.row === rowIndex && focusedCell.col === colIndex;
                const displayValue = isFocused && formulas[key] ? formulas[key] : (cells[key] || '');
                const isSelected = selectionStart && selectionEnd &&
                  rowIndex >= Math.min(selectionStart.row, selectionEnd.row) &&
                  rowIndex <= Math.max(selectionStart.row, selectionEnd.row) &&
                  colIndex >= Math.min(selectionStart.col, selectionEnd.col) &&
                  colIndex <= Math.max(selectionStart.col, selectionEnd.col);
                return (
                  <div
                    key={key}
                    className={`
                      absolute
                      ${isSelected ? 'bg-blue-100' : ''}
                      ${isSelected && isFocused ? 'bg-white' : ''}
                    `}
                    style={{
                      top: rv.start,
                      left: cv.start,
                      width: cv.size,
                      height: rv.size,
                    }}
                    onMouseDown={() => {
                      setSelectionStart({ row: rowIndex, col: colIndex });
                      setSelectionEnd({ row: rowIndex, col: colIndex });
                      setIsSelecting(true);
                    }}
                    onMouseOver={() => {
                      if (isSelecting) {
                        setSelectionEnd({ row: rowIndex, col: colIndex });
                      }
                    }}
                    onMouseUp={() => setIsSelecting(false)}
                  >
                    <input
                      type="text"
                      className={`
                        absolute bg-transparent outline-none
                        ${isFocused ? 'border-2 border-blue-500' : 'border border-gray-300'}
                      `}
                      style={{
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        boxSizing: 'border-box',
                      }}
                      value={displayValue}
                      onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                      onBlur={() => setFocusedCell(null)}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    />
                  </div>
                );
              });
            })}
          </div>
        </div>
        {/* Grouping dropdown removed from here */}
      </div>
    </div>
  );
}