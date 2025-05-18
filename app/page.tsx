"use client";
// app/page.tsx
import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type CellMap = Record<string, string>;

export default function Home() {
  const [cells, setCells] = useState<CellMap>({});
  const [maxRows, setMaxRows] = useState(17); // Dynamic rows
  const [maxCols, setMaxCols] = useState(10); // Dynamic columns
  const parentRef = useRef<HTMLDivElement>(null);

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
    <div ref={parentRef} className="h-screen w-screen  overflow-auto relative">
      <div
        style={{
          width: columnVirtualizer.getTotalSize(),
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((rowVirtualItem) =>
          columnVirtualizer.getVirtualItems().map((colVirtualItem) => {
            const rowIndex = rowVirtualItem.index;
            const colIndex = colVirtualItem.index;
            const key = `${rowIndex},${colIndex}`;
            const value = cells[key] || '';
            return (
              <input
                key={key}
                type="text"
                className="absolute bg-transparent outline-none border border-gray-200"
                style={{
                  top: rowVirtualItem.start,
                  left: colVirtualItem.start,
                  width: colVirtualItem.size,
                  height: rowVirtualItem.size,
                }}
                value={value}
                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}