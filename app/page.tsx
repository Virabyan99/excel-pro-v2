"use client";
import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Papa from 'papaparse';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { evaluate } from 'mathjs'; // Import Math.js for formula evaluation

type CellMap = Record<string, string>;

export default function Home() {
  const [cells, setCells] = useState<CellMap>({});
  const [maxRows, setMaxRows] = useState(22); // Dynamic rows
  const [maxCols, setMaxCols] = useState(14); // Dynamic columns
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const HEADER_HEIGHT = 34; // Matches row height estimate
  const ROW_HEADER_WIDTH = 126; // Matches column width estimate

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const key = `${rowIndex},${colIndex}`;
    let newValue = value;

    // Handle formulas starting with '='
    if (value.startsWith('=')) {
      try {
        const expr = value.slice(1); // Remove the '='
        const result = evaluate(expr); // Evaluate the expression
        newValue = String(result); // Convert result to string
      } catch {
        newValue = '#ERROR'; // Set error on invalid expression
      }
    }

    // Update cells state, maintaining sparsity
    setCells((prev) => {
      const next = { ...prev };
      if (newValue.trim() === '') {
        delete next[key];
      } else {
        next[key] = newValue;
      }
      return next;
    });

    // Auto-expansion logic
    setMaxRows((prev) => (rowIndex >= prev - 2 ? prev + 10 : prev));
    setMaxCols((prev) => (colIndex >= prev - 2 ? prev + 10 : prev));
  };

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

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* CSV Import */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
        />
      </div>

      {/* Export Button */}
      <div className="absolute top-2 right-2 z-10">
        <Button onClick={exportToCSV}>Export CSV</Button>
      </div>

      {/* Column Headers */}
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

      {/* Row Headers */}
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

      {/* Scrollable Data Grid */}
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
                <input
                  key={key}
                  type="text"
                  className={`absolute bg-transparent outline-none border border-gray-200 ${
                    isFocused ? 'border-2 border-blue-500' : ''
                  }`}
                  style={{
                    top: rv.start,
                    left: cv.start,
                    width: cv.size,
                    height: rv.size,
                    boxSizing: 'border-box',
                  }}
                  value={value}
                  onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                  onBlur={() => setFocusedCell(null)}
                  onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}