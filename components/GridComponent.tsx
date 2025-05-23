import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';

interface GridComponentProps {
  items: ({ type: 'group'; value: string } | { type: 'row'; rowIndex: number })[];
  cells: Record<string, string>;
  formulas: Record<string, string>;
  focusedCell: { row: number; col: number } | null;
  selectionStart: { row: number; col: number } | null;
  selectionEnd: { row: number; col: number } | null;
  isSelecting: boolean;
  setFocusedCell: (cell: { row: number; col: number } | null) => void;
  setSelectionStart: (cell: { row: number; col: number } | null) => void;
  setSelectionEnd: (cell: { row: number; col: number } | null) => void;
  setIsSelecting: (selecting: boolean) => void;
  handleCellChange: (rowIndex: number, colIndex: number, value: string) => void;
  parentRef: React.RefObject<HTMLDivElement>;
  maxCols: number;
}

export function GridComponent({
  items,
  cells,
  formulas,
  focusedCell,
  selectionStart,
  selectionEnd,
  isSelecting,
  setFocusedCell,
  setSelectionStart,
  setSelectionEnd,
  setIsSelecting,
  handleCellChange,
  parentRef,
  maxCols,
}: GridComponentProps) {
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

  return (
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
        {rowVirtualizer.getVirtualItems().map((rv: VirtualItem) => {
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
          return columnVirtualizer.getVirtualItems().map((cv: VirtualItem) => {
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
  );
}