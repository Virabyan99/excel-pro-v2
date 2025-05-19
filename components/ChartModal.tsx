"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "./ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, X } from 'lucide-react';
import chroma from 'chroma-js';

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
  const [chartType, setChartType] = useState('bar');

  // Generate a color palette
  const colors = chroma.scale(['#ff6384', '#36a2eb', '#ffce56']).mode('lch').colors(rowLabels.length);

  // Transform data based on chart type
  const getChartData = () => {
    if (chartType === 'pie') {
      return rowLabels.map((label, i) => ({
        name: label,
        value: data[i].reduce((sum, val) => sum + val, 0),
      }));
    }
    return colLabels.map((colLabel, j) => {
      const point: Record<string, string | number> = { label: colLabel };
      rowLabels.forEach((rowLabel, i) => {
        point[rowLabel] = data[i][j];
      });
      return point;
    });
  };

  const chartData = getChartData();

  // Define chartConfig for ChartContainer
  const chartConfig = rowLabels.reduce((acc, rowLabel, index) => {
    acc[rowLabel] = {
      label: `Row ${rowLabel}`,
      color: colors[index],
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

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={chartData}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            {rowLabels.map((rowLabel, index) => (
              <Bar
                key={rowLabel}
                dataKey={rowLabel}
                name={`Row ${rowLabel}`}
                stackId="a"
                fill={chartConfig[rowLabel].color}
              />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={chartData}>
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            {rowLabels.map((rowLabel, index) => (
              <Line
                key={rowLabel}
                type="monotone"
                dataKey={rowLabel}
                name={`Row ${rowLabel}`}
                stroke={chartConfig[rowLabel].color}
              />
            ))}
          </LineChart>
        );
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              label
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
          </PieChart>
        );
      default:
        return null;
    }
  };

  const handleDownload = () => {
    // Placeholder for download logic (e.g., using html2canvas)
    alert('Download functionality to be implemented');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded  shadow-lg w-3/4 h-3/4 p-4">
        <button
          onClick={onClose}
          className="absolute top-1 right-2 text-gray-600 hover:text-gray-800"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex justify-between mt-2 items-center mb-4">
          <h2 className="text-xl font-bold">Chart Visualization</h2>
          <div className="flex gap-2">
            <Tabs defaultValue="bar" onValueChange={setChartType}>
              <TabsList>
                <TabsTrigger value="bar">Bar</TabsTrigger>
                <TabsTrigger value="line">Line</TabsTrigger>
                <TabsTrigger value="pie">Pie</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[calc(100%-4rem)]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}