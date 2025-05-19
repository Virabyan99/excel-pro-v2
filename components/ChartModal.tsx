"use client";

import React, { useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "./ui/chart";

interface ChartModalProps {
  rowLabels: string[];
  colLabels: string[];
  data: number[][];
  onClose: () => void;
}

export function ChartModal({
  rowLabels,
  colLabels,
  data,
  onClose,
}: ChartModalProps) {
  // Transform data into Recharts format: one object per column
  const chartData = colLabels.map((colLabel, j) => {
    const point: Record<string, string | number> = { label: colLabel };
    rowLabels.forEach((rowLabel, i) => {
      point[rowLabel] = data[i][j];
    });
    return point;
  });

  // Define chartConfig for ChartContainer
  const chartConfig = rowLabels.reduce((acc, rowLabel) => {
    acc[rowLabel] = {
      label: `Row ${rowLabel}`,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  // Add Escape key listener for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded shadow-lg w-3/4 h-3/4 p-4">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
        >
          Close
        </button>
        <ChartContainer config={chartConfig} className="h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              {rowLabels.map((rowLabel) => (
                <Bar
                  key={rowLabel}
                  dataKey={rowLabel}
                  name={`Row ${rowLabel}`}
                  stackId="a"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}