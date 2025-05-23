import React from 'react';
import { VirtualItem } from '@tanstack/react-virtual';

// Updated interface with all required props
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
  columnOrder: number[];
  columnWidths: number[];
  rowHeights: number[];
  columnVirtualizer: ReturnType<typeof useVirtualizer>;
  rowVirtualizer: ReturnType<typeof useVirtualizer>;
  sortColumn: number | null;
  sortOrder: 'asc' | 'desc' | null;
  handleSort: (columnIndex: number) => void;
  setColumnWidths: (widths: number[]) => void;
  setRowHeights: (heights: number[]) => void;
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
  columnOrder,
  columnWidths,
  rowHeights,
  columnVirtualizer,
  rowVirtualizer,
  sortColumn,
  sortOrder,
  handleSort,
  setColumnWidths,
  setRowHeights,
}: GridComponentProps) {
  return (
    <div
      ref={parentRef}
      className="absolute overflow-auto"
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        style={{
          width: columnVirtualizer.getTotalSize(),
          height: rowVirtualizer.getTotalSize(),
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((rv: VirtualItem) => {
          if (rv.index === 0) {
            // Column headers
            return columnVirtualizer.getVirtualItems().map((cv: VirtualItem) => {
              const colIndex = cv.index;
              if (colIndex === 0) {
                return (
                  <div
                    key={cv.index}
                    className="absolute flex items-center justify-center font-bold border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    style={{
                      top: rv.start,
                      left: cv.start,
                      width: cv.size,
                      height: rv.size,
                    }}
                  >
                    {/* Top-left corner */}
                  </div>
                );
              }
              const dataColIndex = columnOrder[colIndex - 1];
              return (
                <div
                  key={cv.index}
                  className="absolute flex items-center justify-center font-bold border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
                  style={{
                    top: rv.start,
                    left: cv.start,
                    width: cv.size,
                    height: rv.size,
                  }}
                  onClick={() => handleSort(dataColIndex)}
                >
                  {String.fromCharCode(65 + dataColIndex)}
                  {sortColumn === dataColIndex && (
                    <span>{sortOrder === 'asc' ? ' 🔼' : ' 🔽'}</span>
                  )}
                  <div
                    className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const startWidth = columnWidths[colIndex];
                      const onMouseMove = (e: MouseEvent) => {
                        const newWidth = startWidth + (e.clientX - startX);
                        if (newWidth > 50) {
                          setColumnWidths((prev) => {
                            const newWidths = [...prev];
                            newWidths[colIndex] = newWidth;
                            return newWidths;
                          });
                          columnVirtualizer.measure();
                        }
                      };
                      const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };
                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  />
                </div>
              );
            });
          }

          const rowIndex = rv.index - 1; // Adjust for header row
          const item = items[rowIndex];
          if (item.type === 'group') {
            return (
              <div
                key={`group-${rowIndex}`}
                className="absolute w-full h-[34px] bg-gray-200 dark:bg-gray-800 flex items-center justify-start p-2 font-bold text-gray-900 dark:text-gray-100"
                style={{ top: rv.start, left: 0 }}
              >
                {item.value || '(Empty)'}
              </div>
            );
          }
          const dataRowIndex = item.rowIndex;
          return columnVirtualizer.getVirtualItems().map((cv: VirtualItem) => {
            const colIndex = cv.index;
            if (colIndex === 0) {
              return (
                <div
                  key={cv.index}
                  className="absolute flex items-center justify-center font-bold border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  style={{
                    top: rv.start,
                    left: cv.start,
                    width: cv.size,
                    height: rv.size,
                  }}
                >
                  {dataRowIndex + 1}
                  <div
                    className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize bg-transparent hover:bg-gray-200 dark:hover:bg-gray-600"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startY = e.clientY;
                      const startHeight = rowHeights[dataRowIndex];
                      const onMouseMove = (e: MouseEvent) => {
                        const newHeight = startHeight + (e.clientY - startY);
                        if (newHeight > 20) {
                          setRowHeights((prev) => {
                            const newHeights = [...prev];
                            newHeights[dataRowIndex] = newHeight;
                            return newHeights;
                          });
                          rowVirtualizer.measure();
                        }
                      };
                      const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                      };
                      document.addEventListener('mousemove', onMouseMove);
                      document.addEventListener('mouseup', onMouseUp);
                    }}
                  />
                </div>
              );
            }
            const dataColIndex = columnOrder[colIndex - 1];
            const key = `${dataRowIndex},${dataColIndex}`;
            const isFocused = focusedCell?.row === dataRowIndex && focusedCell.col === dataColIndex;
            const displayValue = isFocused && formulas[key] ? formulas[key] : (cells[key] || '');
            const isSelected =
              selectionStart &&
              selectionEnd &&
              dataRowIndex >= Math.min(selectionStart.row, selectionEnd.row) &&
              dataRowIndex <= Math.max(selectionStart.row, selectionEnd.row) &&
              dataColIndex >= Math.min(selectionStart.col, selectionEnd.col) &&
              dataColIndex <= Math.max(selectionStart.col, selectionEnd.col);
            return (
              <div
                key={key}
                className={`
                  absolute
                  ${isSelected ? 'bg-blue-200 dark:bg-blue-800' : ''}
                  ${isSelected && isFocused ? 'bg-white dark:bg-gray-900' : ''}
                `}
                style={{
                  top: rv.start,
                  left: cv.start,
                  width: cv.size,
                  height: rv.size,
                }}
                onMouseDown={() => {
                  setSelectionStart({ row: dataRowIndex, col: dataColIndex });
                  setSelectionEnd({ row: dataRowIndex, col: dataColIndex });
                  setIsSelecting(true);
                }}
                onMouseOver={() => {
                  if (isSelecting) {
                    setSelectionEnd({ row: dataRowIndex, col: dataColIndex });
                  }
                }}
                onMouseUp={() => setIsSelecting(false)}
              >
                <input
                  type="text"
                  className={`
                    absolute bg-transparent outline-none text-gray-900 dark:text-gray-100
                    ${isFocused ? 'border-2 border-blue-500 dark:border-blue-400' : 'border border-gray-300 dark:border-gray-600'}
                  `}
                  style={{
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    boxSizing: 'border-box',
                  }}
                  value={displayValue}
                  onFocus={() => setFocusedCell({ row: dataRowIndex, col: dataColIndex })}
                  onBlur={() => setFocusedCell(null)}
                  onChange={(e) => handleCellChange(dataRowIndex, dataColIndex, e.target.value)}
                />
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}