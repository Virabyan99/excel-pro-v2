// components/FormulaBar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

interface FormulaBarProps {
  focusedCell: { row: number; col: number } | null;
  formulas: Record<string, string>;
  cells: Record<string, string>;
  handleCellChange: (rowIndex: number, colIndex: number, value: string) => void;
}

export function FormulaBar({ focusedCell, formulas, cells, handleCellChange }: FormulaBarProps) {
  const [draft, setDraft] = useState('');

  // Update the draft whenever the focused cell, formulas, or cells change
  useEffect(() => {
    if (focusedCell) {
      const key = `${focusedCell.row},${focusedCell.col}`;
      const formula = formulas[key];
      const value = cells[key];
      // Show formula if it exists, otherwise show the value (or empty string if neither)
      setDraft(formula || value || '');
    } else {
      setDraft('');
    }
  }, [focusedCell, formulas, cells]);

  // Commit the changes to the cell
  const commit = () => {
    if (focusedCell) {
      handleCellChange(focusedCell.row, focusedCell.col, draft);
    }
  };

  return (
    <Input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
        }
      }}
      placeholder="Formula or value"
      className="w-full"
    />
  );
}