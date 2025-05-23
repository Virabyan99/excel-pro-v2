// components/Header.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import { FormulaBar } from './FormulaBar'; // Import the new FormulaBar component

interface HeaderProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  maxCols: number;
  setGroupingColumn: (column: number | null) => void;
  groupingColumn: number | null;
  applyFilter: (column: number, value: string) => void;
  focusedCell: { row: number; col: number } | null; // Added for FormulaBar
  formulas: Record<string, string>; // Added for FormulaBar
  cells: Record<string, string>; // Added for FormulaBar
  handleCellChange: (rowIndex: number, colIndex: number, value: string) => void; // Added for FormulaBar
}

export function Header({
  onImport,
  onExport,
  maxCols,
  setGroupingColumn,
  groupingColumn,
  applyFilter,
  focusedCell,
  formulas,
  cells,
  handleCellChange,
}: HeaderProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterColumnLocal, setFilterColumnLocal] = useState<number | null>(null);
  const [filterValueLocal, setFilterValueLocal] = useState('');
  const columns = Array.from({ length: maxCols }, (_, i) => String.fromCharCode(65 + i));

  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 shadow-md p-2 flex items-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mr-4">Spreadsheet App</h1>
      <div className="flex-grow mr-4">
        <FormulaBar
          focusedCell={focusedCell}
          formulas={formulas}
          cells={cells}
          handleCellChange={handleCellChange}
        />
      </div>
      <div className="flex gap-2 items-center">
        {/* Grouping Select */}
        <Select
          value={groupingColumn !== null ? String(groupingColumn) : 'none'}
          onValueChange={(value) => setGroupingColumn(value === 'none' ? null : Number(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Grouping</SelectItem>
            {columns.map((col, i) => (
              <SelectItem key={i} value={String(i)}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Filter Popover */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">Filter</Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <Select
                value={filterColumnLocal !== null ? String(filterColumnLocal) : undefined}
                onValueChange={(value) => setFilterColumnLocal(value ? Number(value) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Filter value"
                value={filterValueLocal}
                onChange={(e) => setFilterValueLocal(e.target.value)}
              />
              <Button
                onClick={() => {
                  if (filterColumnLocal !== null) {
                    applyFilter(filterColumnLocal, filterValueLocal);
                    setFilterOpen(false);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {/* Import/Export */}
        <TooltipProvider>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={onImport}
                    className="hidden"
                    id="import-csv"
                  />
                  <label htmlFor="import-csv">
                    <Button asChild>
                      <span className="flex items-center">
                        <Upload className="mr-2 h-4 w-4" />
                        Import CSV
                      </span>
                    </Button>
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Import data from a CSV file</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onExport} className="flex items-center">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Export current sheet to CSV</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
        <ThemeToggle />
      </div>
    </div>
  );
}