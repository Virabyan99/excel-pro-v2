'use client'
import React, { useState, useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import Papa from 'papaparse'
import { z } from 'zod'
import dynamic from 'next/dynamic'
import { Header } from '@/components/Header'
import { GridComponent } from '@/components/GridComponent'
import { calculateFormulas } from '@/components/FormulaHandler'
import {
  sortData,
  getFilteredRowIndices,
  getGroupedItems,
} from '@/components/DataHandler'
import { getDataArray, setDataArray } from '@/lib/dataUtils'
import { Document, defaultDocument } from '@/lib/types'

const ChartModal = dynamic(
  () => import('@/components/ChartModal').then((mod) => mod.ChartModal),
  { ssr: false }
)

type CellMap = Record<string, string>

export default function Home() {
  const [document, setDocument] = useState<Document>(defaultDocument)
  const currentSheet = document.sheets[document.activeSheetIndex]
  const parentRef = useRef<HTMLDivElement>(null)
  const isUpdating = useRef(false)
  const currentColumnWidthsRef = useRef(currentSheet.columnWidths)

  const HEADER_HEIGHT = 34
  const ROW_HEADER_WIDTH = 126

  // Load document from local storage on mount
  useEffect(() => {
    const savedDocument = localStorage.getItem('spreadsheetDocument')
    if (savedDocument) {
      try {
        const parsedDocument = JSON.parse(savedDocument)
        const fixedSheets = parsedDocument.sheets.map(sheet => {
          const maxCols = sheet.maxCols || 14
          const maxRows = sheet.maxRows || 22
          let columnWidths = Array.isArray(sheet.columnWidths) ? [...sheet.columnWidths] : Array(maxCols + 1).fill(126)
          let rowHeights = Array.isArray(sheet.rowHeights) ? [...sheet.rowHeights] : Array(maxRows).fill(34)
          while (columnWidths.length < maxCols + 1) columnWidths.push(126)
          while (rowHeights.length < maxRows) rowHeights.push(34)
          return {
            ...sheet,
            maxCols,
            maxRows,
            columnWidths,
            rowHeights,
          }
        })
        setDocument({ ...parsedDocument, sheets: fixedSheets })
      } catch (error) {
        console.error('Failed to parse saved document:', error)
      }
    }
  }, [])

  // Save document to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('spreadsheetDocument', JSON.stringify(document))
  }, [document])

  useEffect(() => {
    const handleMouseUp = () => setIsSelecting(false)
    window.document.addEventListener('mouseup', handleMouseUp)
    return () => window.document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  useEffect(() => {
    currentColumnWidthsRef.current = currentSheet.columnWidths
  }, [currentSheet.columnWidths])

  const switchSheet = (index: number) => {
    setDocument((prev) => ({ ...prev, activeSheetIndex: index }))
  }

  const addSheet = () => {
    setDocument((prev) => {
      const newSheet = {
        name: `Sheet${prev.sheets.length + 1}`,
        cells: {},
        formulas: {},
        maxRows: 22,
        maxCols: 14,
        focusedCell: null,
        selectionStart: null,
        selectionEnd: null,
        isSelecting: false,
        sortColumn: null,
        sortOrder: null,
        filters: {},
        groupingColumn: null,
        columnWidths: Array(15).fill(126),
        rowHeights: Array(23).fill(34),
        columnOrder: Array.from({ length: 15 }, (_, i) => i),
      }
      return {
        ...prev,
        sheets: [...prev.sheets, newSheet],
        activeSheetIndex: prev.sheets.length,
      }
    })
  }

  const handleCellChange = (rowIndex: number, colIndex: number, rawValue: string) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      const key = `${rowIndex},${colIndex}`
      if (rawValue.startsWith('=')) {
        currentSheet.formulas = { ...currentSheet.formulas, [key]: rawValue }
        currentSheet.cells = { ...currentSheet.cells, [key]: rawValue }
      } else {
        const newFormulas = { ...currentSheet.formulas }
        delete newFormulas[key]
        currentSheet.formulas = newFormulas
        const newCells = { ...currentSheet.cells }
        if (rawValue.trim() === '') {
          delete newCells[key]
        } else {
          newCells[key] = rawValue
        }
        currentSheet.cells = newCells
      }
      if (rowIndex >= currentSheet.maxRows - 2) {
        currentSheet.maxRows += 10
        currentSheet.rowHeights = [...currentSheet.rowHeights, ...Array(10).fill(34)]
      }
      if (colIndex >= currentSheet.maxCols - 2) {
        currentSheet.maxCols += 10
        currentSheet.columnWidths = [...currentSheet.columnWidths, ...Array(10).fill(126)]
        currentSheet.columnOrder = [
          ...currentSheet.columnOrder,
          ...Array.from({ length: 10 }, (_, i) => currentSheet.columnOrder.length + i),
        ]
      }
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const applyFilter = (column: number, value: string) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      if (value.trim() === '') {
        const { [column]: _, ...rest } = currentSheet.filters
        currentSheet.filters = rest
      } else {
        currentSheet.filters = { ...currentSheet.filters, [column]: value }
      }
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setGroupingColumn = (column: number | null) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      currentSheet.groupingColumn = column
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setFocusedCell = (cell: { row: number; col: number } | null) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      currentSheet.focusedCell = cell
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setSelectionStart = (cell: { row: number; col: number } | null) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      currentSheet.selectionStart = cell
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setSelectionEnd = (cell: { row: number; col: number } | null) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      currentSheet.selectionEnd = cell
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setIsSelecting = (selecting: boolean) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      currentSheet.isSelecting = selecting
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setColumnWidths = (updater: number[] | ((prev: number[]) => number[])) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      const prevWidths = Array.isArray(currentSheet.columnWidths) ? currentSheet.columnWidths : Array(currentSheet.maxCols + 1).fill(126)
      const newWidths = typeof updater === 'function' ? updater(prevWidths) : updater
      console.log(`Sheet ${currentSheet.name}: Updating columnWidths`, prevWidths, 'to', newWidths)
      currentSheet.columnWidths = newWidths
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const setRowHeights = (updater: number[] | ((prev: number[]) => number[])) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      const prevHeights = Array.isArray(currentSheet.rowHeights) ? currentSheet.rowHeights : Array(currentSheet.maxRows).fill(34)
      const newHeights = typeof updater === 'function' ? updater(prevHeights) : updater
      console.log(`Sheet ${currentSheet.name}: Updating rowHeights`, prevHeights, 'to', newHeights)
      currentSheet.rowHeights = newHeights
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const handleSort = (columnIndex: number) => {
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      if (currentSheet.sortColumn === columnIndex) {
        if (currentSheet.sortOrder === 'asc') {
          currentSheet.sortOrder = 'desc'
          sortData(currentSheet.cells, currentSheet.maxRows, currentSheet.maxCols, columnIndex, 'desc')
        } else if (currentSheet.sortOrder === 'desc') {
          currentSheet.sortColumn = null
          currentSheet.sortOrder = null
        } else {
          currentSheet.sortOrder = 'asc'
          sortData(currentSheet.cells, currentSheet.maxRows, currentSheet.maxCols, columnIndex, 'asc')
        }
      } else {
        currentSheet.sortColumn = columnIndex
        currentSheet.sortOrder = 'asc'
        sortData(currentSheet.cells, currentSheet.maxRows, currentSheet.maxCols, columnIndex, 'asc')
      }
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const handleDragStart = (e: React.DragEvent, colIndex: number) => {
    e.dataTransfer.setData('colIndex', colIndex.toString())
  }

  const handleDrop = (e: React.DragEvent, targetColIndex: number) => {
    const fromColIndex = parseInt(e.dataTransfer.getData('colIndex'), 10)
    const fromIdx = currentSheet.columnOrder.indexOf(fromColIndex)
    const toIdx = currentSheet.columnOrder.indexOf(targetColIndex)
    if (fromIdx === toIdx) return
    setDocument((prev) => {
      const newSheets = [...prev.sheets]
      const currentSheet = { ...newSheets[prev.activeSheetIndex] }
      const newOrder = [...currentSheet.columnOrder]
      newOrder.splice(fromIdx, 1)
      newOrder.splice(toIdx, 0, fromColIndex)
      currentSheet.columnOrder = newOrder
      newSheets[prev.activeSheetIndex] = currentSheet
      return { ...prev, sheets: newSheets }
    })
  }

  const exportToCSV = () => {
    const data = getDataArray(currentSheet.cells, currentSheet.maxRows, currentSheet.maxCols)
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${currentSheet.name}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    Papa.parse<string[]>(file, {
      complete: (results) => {
        try {
          const raw = results.data as string[][]
          const sheet = z.array(z.array(z.string())).parse(raw)
          const cols = sheet[0]?.length ?? 0
          const newCells: CellMap = {}
          sheet.forEach((row, rowIndex) => {
            row.forEach((cell, colIndex) => {
              z.string().parse(cell)
              if (cell.trim() !== '') {
                newCells[`${rowIndex},${colIndex}`] = cell
              }
            })
          })
          setDocument((prev) => {
            const newSheets = [...prev.sheets]
            const currentSheet = { ...newSheets[prev.activeSheetIndex] }
            currentSheet.cells = newCells
            currentSheet.maxRows = sheet.length + 2
            currentSheet.maxCols = cols + 2
            currentSheet.columnWidths = Array(cols + 3).fill(126)
            currentSheet.rowHeights = Array(sheet.length + 3).fill(34)
            currentSheet.columnOrder = Array.from({ length: cols + 3 }, (_, i) => i)
            newSheets[prev.activeSheetIndex] = currentSheet
            return { ...prev, sheets: newSheets }
          })
        } catch (err: any) {
          alert(`Import failed: ${err.message}`)
        }
      },
      error: (err) => alert(`Parsing error: ${err.message}`),
    })
    e.target.value = ''
  }

  useEffect(() => {
    if (isUpdating.current) {
      isUpdating.current = false
      return
    }
    const newCells = calculateFormulas(currentSheet.cells, currentSheet.formulas)
    if (JSON.stringify(newCells) !== JSON.stringify(currentSheet.cells)) {
      isUpdating.current = true
      setDocument((prev) => {
        const newSheets = [...prev.sheets]
        const currentSheet = { ...newSheets[prev.activeSheetIndex] }
        currentSheet.cells = newCells
        newSheets[prev.activeSheetIndex] = currentSheet
        return { ...prev, sheets: newSheets }
      })
    }
  }, [currentSheet.cells, currentSheet.formulas])

  function getSelectedData() {
    if (!currentSheet.selectionStart || !currentSheet.selectionEnd)
      return { rowLabels: [], colLabels: [], data: [] }
    const rowMin = Math.min(currentSheet.selectionStart.row, currentSheet.selectionEnd.row)
    const rowMax = Math.max(currentSheet.selectionStart.row, currentSheet.selectionEnd.row)
    const colMin = Math.min(currentSheet.selectionStart.col, currentSheet.selectionEnd.col)
    const colMax = Math.max(currentSheet.selectionStart.col, currentSheet.selectionEnd.col)
    const rowLabels = Array.from({ length: rowMax - rowMin + 1 }, (_, i) =>
      String(rowMin + i + 1)
    )
    const colLabels = Array.from({ length: colMax - colMin + 1 }, (_, j) =>
      String.fromCharCode(65 + colMin + j)
    )
    const data = rowLabels.map((_, i) =>
      colLabels.map((_, j) => {
        const key = `${rowMin + i},${colMin + j}`
        const raw = currentSheet.cells[key] || ''
        const num = parseFloat(raw)
        return isNaN(num) ? 0 : num
      })
    )
    return { rowLabels, colLabels, data }
  }

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: currentSheet.maxCols + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => currentSheet.columnWidths[index] || 126,
    overscan: 5,
  })

  const filteredIndices = getFilteredRowIndices(
    currentSheet.cells,
    currentSheet.maxRows,
    currentSheet.filters
  )
  const items = getGroupedItems(currentSheet.cells, filteredIndices, currentSheet.groupingColumn)

  const rowVirtualizer = useVirtualizer({
    count: items.length + 1,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      if (index === 0) return HEADER_HEIGHT
      const item = items[index - 1]
      if (item.type === 'group') return 34
      return currentSheet.rowHeights[item.rowIndex] || 34
    },
    overscan: 5,
  })

  // Ensure virtualizers remeasure when sizes change
  useEffect(() => {
    columnVirtualizer.measure()
  }, [currentSheet.columnWidths])

  useEffect(() => {
    rowVirtualizer.measure()
  }, [currentSheet.rowHeights])

  const deleteSheet = (index: number) => {
    if (document.sheets.length <= 1) return; // Prevent deleting the last sheet
    setDocument((prev) => {
      const newSheets = prev.sheets.filter((_, i) => i !== index);
      const newActiveIndex = index >= newSheets.length ? newSheets.length - 1 : index;
      return {
        ...prev,
        sheets: newSheets,
        activeSheetIndex: newActiveIndex,
      };
    });
  };

  // Log current sheet sizes for debugging
  console.log(`Sheet ${currentSheet.name}: columnWidths`, currentSheet.columnWidths)
  console.log(`Sheet ${currentSheet.name}: rowHeights`, currentSheet.rowHeights)

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header
        onImport={handleImportCSV}
        onExport={exportToCSV}
        maxCols={currentSheet.maxCols}
        setGroupingColumn={setGroupingColumn}
        groupingColumn={currentSheet.groupingColumn}
        applyFilter={applyFilter}
        focusedCell={currentSheet.focusedCell}
        formulas={currentSheet.formulas}
        cells={currentSheet.cells}
        handleCellChange={handleCellChange}
        sheets={document.sheets}
        activeSheetIndex={document.activeSheetIndex}
        switchSheet={switchSheet}
        addSheet={addSheet}
        deleteSheet={deleteSheet}
      />
      <div className="flex-1 relative mt-13 overflow-hidden">
        {currentSheet.selectionStart && currentSheet.selectionEnd && (
          <button
            onClick={() => setDocument((prev) => ({ ...prev, sheets: prev.sheets.map((s, i) => i === prev.activeSheetIndex ? { ...s, isChartOpen: true } : s) }))}
            className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-blue-600 text-white rounded"
          >
            Visualize
          </button>
        )}
        {currentSheet.isChartOpen && (
          <ChartModal
            rowLabels={getSelectedData().rowLabels}
            colLabels={getSelectedData().colLabels}
            data={getSelectedData().data}
            onClose={() => setDocument((prev) => ({ ...prev, sheets: prev.sheets.map((s, i) => i === prev.activeSheetIndex ? { ...s, isChartOpen: false } : s) }))}
          />
        )}
        <GridComponent
          items={items}
          cells={currentSheet.cells}
          formulas={currentSheet.formulas}
          focusedCell={currentSheet.focusedCell}
          selectionStart={currentSheet.selectionStart}
          selectionEnd={currentSheet.selectionEnd}
          isSelecting={currentSheet.isSelecting}
          setFocusedCell={setFocusedCell}
          setSelectionStart={setSelectionStart}
          setSelectionEnd={setSelectionEnd}
          setIsSelecting={setIsSelecting}
          handleCellChange={handleCellChange}
          parentRef={parentRef}
          maxCols={currentSheet.maxCols}
          columnOrder={currentSheet.columnOrder}
          columnWidths={currentSheet.columnWidths}
          rowHeights={currentSheet.rowHeights}
          columnVirtualizer={columnVirtualizer}
          rowVirtualizer={rowVirtualizer}
          sortColumn={currentSheet.sortColumn}
          sortOrder={currentSheet.sortOrder}
          handleSort={handleSort}
          setColumnWidths={setColumnWidths}
          setRowHeights={setRowHeights}
        />
      </div>
    </div>
  )
}