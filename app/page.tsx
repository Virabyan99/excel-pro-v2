"use client";
// app/page.tsx
import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';

type CellMap = Record<string, string>;

export default function Home() {
  const [cells, setCells] = useState<CellMap>({});
  const maxRows = 12;
  const maxCols = 12;

  // Define 12 columns labeled A–L
  const columns = useMemo<ColumnDef<Record<string, string>>[]>(() =>
    Array.from({ length: maxCols }, (_, i) => ({
      accessorKey: `col${i}`,
      header: String.fromCharCode(65 + i),
      cell: () => null,
    })),
  [maxCols]);

  // Generate 12 rows of empty strings
  const data = useMemo(
    () =>
      Array.from({ length: maxRows }, () =>
        Object.fromEntries(
          Array.from({ length: maxCols }, (_, i) => [`col${i}`, ''])
        )
      ),
    [maxRows, maxCols]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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

  return (
    <div className="h-screen w-screen overflow-auto p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => {
                const rowIndex = row.index;
                const colIndex = Number(cell.column.id.replace('col', ''));
                const cellKey = `${rowIndex},${colIndex}`;
                const value = cells[cellKey] || '';
                return (
                  <TableCell key={cell.id}>
                    <input
                      type="text"
                      className="w-full h-full bg-transparent outline-none"
                      value={value}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}