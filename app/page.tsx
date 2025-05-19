"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Papa from 'papaparse';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { evaluate } from 'mathjs';
import dynamic from "next/dynamic";

// Dynamically import ChartModal to ensure client-side rendering only
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
  const [isChartOpen, setIsChartOpen] = useState(false); // State for chart modal visibility
  const parentRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);

  const HEADER_HEIGHT = 34;
  const ROW_HEADER_WIDTH = 126;

  // Global mouse up handler to stop selection
  useEffect(() => {
    const handleMouseUp = () => {
      setIsSelecting(false);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

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

  const calculateFormulas = (currentCells: CellMap, currentFormulas: Record<string, string>): CellMap => {
    const newCells = { ...currentCells };
    Object.entries(currentFormulas).forEach(([key, formula]) => {
      const match = formula.match(/^=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)$/i);
      if (match) {
        const [, startCol, startRow, endCol, endRow] = match;
        const colStart = startCol.charCodeAt(0) - 65;
        const rowStart = parseInt(startRow, 10) - 1;
        const colEnd = endCol.charCodeAt(0) - 65;
        const rowEnd = parseInt(endRow, 10) - 1;

        let sum = 0;
        for (let r = rowStart; r <= rowEnd; r++) {
          for (let c = colStart; c <= colEnd; c++) {
            const cellKey = `${r},${c}`;
            const raw = currentCells[cellKey];
            const num = raw && !isNaN(Number(raw)) ? Number(raw) : 0;
            sum += num;
          }
        }
        newCells[key] = String(sum);
      } else {
        try {
          const expr = formula.slice(1);
          const result = evaluate(expr);
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

  const rowVirtualizer = useVirtualizer({
    count: maxRows,
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
      Array.from({ length: maxCols }, (_, col) =>
        cells[`${row},${col}`] || ''
      )
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
    <div className="relative h-screen w-screen overflow-hidden">
      <div className="absolute top-2 left-2 z-10">
        <input
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
        />
      </div>
      <div className="absolute top-2 right-2 z-10">
        <Button onClick={exportToCSV}>Export CSV</Button>
      </div>
      {/* Visualize Button */}
      {selectionStart && selectionEnd && (
        <button
          onClick={() => setIsChartOpen(true)}
          className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-blue-600 text-white rounded"
        >
          Visualize
        </button>
      )}
      {/* Chart Modal */}
      {isChartOpen && (
        <ChartModal
          rowLabels={getSelectedData().rowLabels}
          colLabels={getSelectedData().colLabels}
          data={getSelectedData().data}
          onClose={() => setIsChartOpen(false)}
        />
      )}
      <div
        className="absolute top-0 left-[126px] right-0 h-[34px] bg-gray-100"
        style={{ pointerEvents: 'none' }}
      >
        {columnVirtualizer.getVirtualItems().map((cv) => (
          <div
            key={cv.index}
            className="absolute flex items-center justify-center font-bold border border-gray-300"
            style={{
              top: 0,
              left: cv.start,
              width: cv.size,
              height: 34,
              boxSizing: 'border-box',
            }}
          >
            {String.fromCharCode(65 + cv.index)}
          </div>
        ))}
      </div>
      <div
        className="absolute left-0 top-[34px] bottom-0 w-[126px] bg-gray-100"
        style={{ pointerEvents: 'none' }}
      >
        {rowVirtualizer.getVirtualItems().map((rv) => (
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
            {rv.index + 1}
          </div>
        ))}
      </div>
      <div
        ref={parentRef}
        className="absolute overflow-auto"
        style={{
          top: 34,
          left: 126,
          right: 0,
          bottom: 0,
        }}
      >
        <div
          style={{
            width: columnVirtualizer.getTotalSize(),
            height: rowVirtualizer.getTotalSize(),
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((rv) =>
            columnVirtualizer.getVirtualItems().map((cv) => {
              const rowIndex = rv.index;
              const colIndex = cv.index;
              const key = `${rowIndex},${colIndex}`;
              const value = cells[key] || '';
              const isFocused = focusedCell?.row === rowIndex && focusedCell.col === colIndex;
              return (
                <div
                  key={key}
                  style={{
                    top: rv.start,
                    left: cv.start,
                    width: cv.size,
                    height: rv.size,
                    position: 'absolute',
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
                  onMouseUp={() => {
                    setIsSelecting(false);
                  }}
                >
                  <input
                    type="text"
                    className={`absolute bg-transparent outline-none border border-gray-200 ${
                      isFocused ? 'border-2 border-blue-500' : ''
                    }`}
                    style={{
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                    }}
                    value={value}
                    onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                    onBlur={() => setFocusedCell(null)}
                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                  />
                </div>
              );
            })
          )}
          {selectionStart && selectionEnd && (() => {
            const rowMin = Math.min(selectionStart.row, selectionEnd.row);
            const rowMax = Math.max(selectionStart.row, selectionEnd.row);
            const colMin = Math.min(selectionStart.col, selectionEnd.col);
            const colMax = Math.max(selectionStart.col, selectionEnd.col);
            return rowVirtualizer.getVirtualItems().flatMap(rv =>
              columnVirtualizer.getVirtualItems().map(cv => {
                const r = rv.index, c = cv.index;
                if (r >= rowMin && r <= rowMax && c >= colMin && c <= colMax) {
                  return (
                    <div
                      key={`sel-${r},${c}`}
                      className="absolute bg-blue-200 bg-opacity-40 pointer-events-none"
                      style={{
                        top: rv.start,
                        left: cv.start,
                        width: cv.size,
                        height: rv.size,
                      }}
                    />
                  );
                }
                return null;
              })
            );
          })()}
        </div>
      </div>
    </div>
  );
}