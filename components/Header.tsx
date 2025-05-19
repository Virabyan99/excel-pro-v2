import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeaderProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export function Header({ onImport, onExport }: HeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-md p-2 flex justify-between items-center">
      <h1 className="text-xl font-bold">Spreadsheet App</h1>
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
    </div>
  );
}