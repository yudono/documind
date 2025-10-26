"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import ResourceFile from "./resource-file";
import { ScatterChart, Scatter, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

type Point = {
  x: number;
  y: number;
  cluster?: number | string;
  label?: string;
};

type ClusterMeta = { id: number | string; name?: string; color?: string };

type ClusteringVisualProps = {
  points: Point[];
  clusters?: ClusterMeta[];
  className?: string;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
};

const defaultColors = [
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#ff7300",
  "#00C49F",
  "#FF8042",
];

export default function ClusteringVisual({
  points,
  clusters,
  className,
  linkedResource,
}: ClusteringVisualProps) {
  const groups = useMemo(() => {
    const byCluster: Record<string, Point[]> = {};
    (points || []).forEach((p) => {
      const key = String(p.cluster ?? "Unassigned");
      if (!byCluster[key]) byCluster[key] = [];
      byCluster[key].push(p);
    });
    return byCluster;
  }, [points]);

  const config = useMemo(() => {
    const cfg: Record<string, { label: string; color?: string }> = {};
    const keys = Object.keys(groups);
    keys.forEach((key, idx) => {
      const meta = clusters?.find((c) => String(c.id) === key);
      cfg[key] = {
        label: meta?.name || `Cluster ${key}`,
        color: meta?.color || defaultColors[idx % defaultColors.length],
      };
    });
    return cfg;
  }, [groups, clusters]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="text-lg font-semibold">Clustering</div>
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
        <ChartContainer config={config} className={className ?? "w-full h-80"}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="X" />
            <YAxis type="number" dataKey="y" name="Y" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.entries(groups).map(([key, pts], idx) => (
              <Scatter
                key={key}
                name={config[key]?.label || key}
                data={pts}
                fill={
                  config[key]?.color ||
                  defaultColors[idx % defaultColors.length]
                }
              />
            ))}
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
