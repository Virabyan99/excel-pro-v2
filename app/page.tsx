"use client";
// app/page.tsx
import React, { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type CellMap = Record<string, string>;

export default function Home() {
  const [cells, setCells] = useState<CellMap>({});
  const parentRef = useRef<HTMLDivElement>(null);
  const maxRows = 100;
  const maxCols = 100;

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const key = `${rowIndex},${colIndex}`;
    setCells((prev) => {
      const next = { ...prev };
      if (value.trim() === '') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const rowVirtualizer = useVirtualizer({
    count: maxRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
    overscan: 5,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: maxCols,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-screen w-screen overflow-auto relative">
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