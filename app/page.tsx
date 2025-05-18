"use client";
// app/page.tsx
import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';


export default function Home() {
  // Define 12 columns labeled A–L
  const columns = useMemo<ColumnDef<Record<string, string>>[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      accessorKey: `col${i}`,
      header: String.fromCharCode(65 + i),
      cell: () => '',
    })),
  []);

  // Generate 12 rows of empty strings
  const data = useMemo(
    () =>
      Array.from({ length: 12 }, () =>
        Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => [`col${i}`, '']),
        ),
      ),
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="h-screen w-screen overflow-auto p-4">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableCell key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}