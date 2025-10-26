"use client";

import React from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader } from "./ui/card";
import ResourceFile from "./resource-file";

type Dataset = {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
};

type ChartData = {
  labels: (string | number)[];
  datasets: Dataset[];
};

type ChartVisualProps = {
  type: "bar" | "line" | "pie" | "area";
  data: ChartData;
  className?: string;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
};

export default function ChartVisual({
  type,
  data,
  className,
  linkedResource,
}: ChartVisualProps) {
  const labels = Array.isArray(data?.labels) ? data.labels : [];
  const datasets = Array.isArray(data?.datasets) ? data.datasets : [];

  // Build config for ChartContainer (maps series keys to colors/labels)
  const config = (() => {
    const cfg: Record<string, { label: string; color?: string }> = {};

    if (type === "pie") {
      const bg = datasets[0]?.backgroundColor;
      labels.forEach((label, idx) => {
        const color = Array.isArray(bg)
          ? bg[idx]
          : typeof bg === "string"
          ? bg
          : undefined;
        cfg[String(label)] = { label: String(label), color };
      });
      return cfg;
    }

    datasets.forEach((ds, idx) => {
      const key = ds.label || `Series ${idx + 1}`;
      const color = Array.isArray(ds.backgroundColor)
        ? ds.backgroundColor[0]
        : ds.backgroundColor;
      cfg[key] = { label: key, color };
    });
    return cfg;
  })();

  // Transform Chart.js-like data shape into Recharts-friendly array of objects
  const chartData = (() => {
    if (type === "pie") {
      const ds = datasets[0] ?? { data: [] };
      return labels.map((label, i) => ({
        name: String(label),
        value: Number(ds.data?.[i] ?? 0),
        fill: Array.isArray(ds.backgroundColor)
          ? ds.backgroundColor[i]
          : ds.backgroundColor,
      }));
    }

    return labels.map((label, i) => {
      const row: Record<string, number | string> = { label: String(label) };
      datasets.forEach((ds, idx) => {
        const key = ds.label || `Series ${idx + 1}`;
        row[key] = Number(ds.data?.[i] ?? 0);
      });
      return row;
    });
  })();

  if (type === "bar") {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="text-lg font-semibold">Charts</div>
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="text-sm font-semibold text-neutral-500">
              Linked Documents
            </div>
            <div className="flex flex-wrap">
              {linkedResource &&
                linkedResource.length > 0 &&
                linkedResource.map((resource, idx) => (
                  <ResourceFile
                    key={idx}
                    resource={resource}
                    withTooltip
                    tooltipText="Download Document"
                  />
                ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer
            config={config}
            className={className ?? "w-full h-80"}
          >
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {datasets.map((ds, idx) => (
                <Bar
                  key={idx}
                  dataKey={ds.label || `Series ${idx + 1}`}
                  fill={
                    (Array.isArray(ds.backgroundColor)
                      ? ds.backgroundColor[0]
                      : ds.backgroundColor) ||
                    `var(--color-${ds.label || `Series ${idx + 1}`})`
                  }
                />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  if (type === "line") {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="text-lg font-semibold">Charts</div>
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="text-sm font-semibold text-neutral-500">
              Linked Documents
            </div>
            <div className="flex flex-wrap">
              {linkedResource &&
                linkedResource.length > 0 &&
                linkedResource.map((resource, idx) => (
                  <ResourceFile
                    key={idx}
                    resource={resource}
                    withTooltip
                    tooltipText="Download Document"
                  />
                ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer
            config={config}
            className={className ?? "w-full h-80"}
          >
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {datasets.map((ds, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={ds.label || `Series ${idx + 1}`}
                  stroke={
                    (Array.isArray(ds.backgroundColor)
                      ? ds.backgroundColor[0]
                      : ds.backgroundColor) ||
                    `var(--color-${ds.label || `Series ${idx + 1}`})`
                  }
                  dot={false}
                />
              ))}
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  if (type === "pie") {
    return (
      <Card>
        <CardHeader className="border-b">
          <div className="text-lg font-semibold">Charts</div>
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="text-sm font-semibold text-neutral-500">
              Linked Documents
            </div>
            <div className="flex flex-wrap">
              {linkedResource &&
                linkedResource.length > 0 &&
                linkedResource.map((resource, idx) => (
                  <ResourceFile
                    key={idx}
                    resource={resource}
                    withTooltip
                    tooltipText="Download Document"
                  />
                ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer
            config={config}
            className={className ?? "w-full h-80"}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  // Fallback: unsupported type
  return (
    <div className="w-full h-80 bg-gray-100 flex items-center justify-center">
      <span className="text-red-500">Unsupported chart type</span>
    </div>
  );
}
