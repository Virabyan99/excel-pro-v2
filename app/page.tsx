"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Papa from 'papaparse';
import { z } from 'zod';
import dynamic from "next/dynamic";
import { Header } from '@/components/Header';
import { GridComponent } from '@/components/GridComponent';
import { calculateFormulas } from '@/components/FormulaHandler';
import { sortData, getFilteredRowIndices, getGroupedItems } from '@/components/DataHandler';
import { getDataArray, setDataArray } from '@/lib/dataUtils';

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
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [filters, setFilters] = useState<Record<number, string>>({});
  const [groupingColumn, setGroupingColumn] = useState<number | null>(null);
  const [columnWidths, setColumnWidths] = useState<number[]>(Array(15).fill(126));
  const [rowHeights, setRowHeights] = useState<number[]>(Array(23).fill(34));
  const [columnOrder, setColumnOrder] = useState<number[]>(Array.from({ length: 15 }, (_, i) => i));
  const parentRef = useRef<HTMLDivElement>(null);
  const isUpdating = useRef(false);
  const currentColumnWidthsRef = useRef(columnWidths);

  const HEADER_HEIGHT = 34;
  const ROW_HEADER_WIDTH = 126;

  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    currentColumnWidthsRef.current = columnWidths;
  }, [columnWidths]);

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
    setMaxRows(prev => {
      if (rowIndex >= prev - 2) {
        const newMax = prev + 10;
        setRowHeights(prevHeights => {
          const newHeights = [...prevHeights];
          while (newHeights.length < newMax + 1) newHeights.push(34);
          return newHeights;
        });
        return newMax;
      }
      return prev;
    });
    setMaxCols(prev => {
      if (colIndex >= prev - 2) {
        const newMax = prev + 10;
        setColumnWidths(prevWidths => {
          const newWidths = [...prevWidths];
          while (newWidths.length < newMax + 1) newWidths.push(126);
          return newWidths;
        });
        return newMax;
      }
      return prev;
    });
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

  const handleSort = (columnIndex: number) => {
    if (sortColumn === columnIndex) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
        sortData(cells, maxRows, maxCols, columnIndex, 'desc');
      } else if (sortOrder === 'desc') {
        setSortColumn(null);
        setSortOrder(null);
      } else {
        setSortOrder('asc');
        sortData(cells, maxRows, maxCols, columnIndex, 'asc');
      }
    } else {
      setSortColumn(columnIndex);
      setSortOrder('asc');
      sortData(cells, maxRows, maxCols, columnIndex, 'asc');
    }
  };

  const handleDragStart = (e: React.DragEvent, colIndex: number) => {
    e.dataTransfer.setData('colIndex', colIndex.toString());
  };

  const handleDrop = (e: React.DragEvent, targetColIndex: number) => {
    const fromColIndex = parseInt(e.dataTransfer.getData('colIndex'), 10);
    const fromIdx = columnOrder.indexOf(fromColIndex);
    const toIdx = columnOrder.indexOf(targetColIndex);
    if (fromIdx === toIdx) return;
    const newOrder = [...columnOrder];
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, fromColIndex);
    setColumnOrder(newOrder);
  };

  const filteredIndices = getFilteredRowIndices(cells, maxRows, filters);
  const items = getGroupedItems(cells, filteredIndices, groupingColumn);

  const exportToCSV = () => {
    const data = getDataArray(cells, maxRows, maxCols);
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
          setColumnWidths(Array(cols + 3).fill(126));
          setRowHeights(Array(sheet.length + 3).fill(34));
          setColumnOrder(Array.from({ length: cols + 3 }, (_, i) => i));
        } catch (err: any) {
          alert(`Import failed: ${err.message}`);
        }
      },
      error: (err) => alert(`Parsing error: ${err.message}`),
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

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: maxCols + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => columnWidths[index] || 126,
    overscan: 5,
  });

  const rowVirtualizer = useVirtualizer({
    count: items.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => index === 0 ? HEADER_HEIGHT : rowHeights[items[index - 1].rowIndex],
    overscan: 5,
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header
        onImport={handleImportCSV}
        onExport={exportToCSV}
        maxCols={maxCols}
        setGroupingColumn={setGroupingColumn}
        groupingColumn={groupingColumn}
        applyFilter={applyFilter}
        columnWidths={columnWidths}
        setColumnWidths={setColumnWidths}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
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
        <GridComponent
          items={items}
          cells={cells}
          formulas={formulas}
          focusedCell={focusedCell}
          selectionStart={selectionStart}
          selectionEnd={selectionEnd}
          isSelecting={isSelecting}
          setFocusedCell={setFocusedCell}
          setSelectionStart={setSelectionStart}
          setSelectionEnd={setSelectionEnd}
          setIsSelecting={setIsSelecting}
          handleCellChange={handleCellChange}
          parentRef={parentRef}
          maxCols={maxCols}
          columnOrder={columnOrder}
          columnWidths={columnWidths}
          rowHeights={rowHeights}
          columnVirtualizer={columnVirtualizer}
          rowVirtualizer={rowVirtualizer}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
          handleSort={handleSort}
          setColumnWidths={setColumnWidths}
          setRowHeights={setRowHeights}
        />
      </div>
    </div>
  );
}