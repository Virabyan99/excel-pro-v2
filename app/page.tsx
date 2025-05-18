"use client";
import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

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

    // Update cell content
    setCells((prev) => {
      const next = { ...prev };
      if (value.trim() === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });

    // Expand rows if editing within 2 rows of the bottom
    setMaxRows((prev) => (rowIndex >= prev - 2 ? prev + 10 : prev));

    // Expand columns if editing within 2 columns of the right
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

  return (
    <div className="relative h-screen w-screen overflow-hidden">
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