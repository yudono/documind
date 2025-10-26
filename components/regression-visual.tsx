"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import ResourceFile from "./resource-file";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

type Point = { x: number; y: number };

type RegressionVisualProps = {
  points: Point[];
  className?: string;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
  type?: any;
};

function leastSquares(points: Point[]) {
  if (!points || points.length < 2) return { slope: 0, intercept: 0 };
  const n = points.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumXX += p.x * p.x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: points[0]?.y || 0 };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export default function RegressionVisual({
  points,
  className,
  linkedResource,
  type,
}: RegressionVisualProps) {
  const { slope, intercept } = useMemo(
    () => leastSquares(points || []),
    [points]
  );

  const data = useMemo(() => {
    return (points || []).map((p) => ({
      x: p.x,
      actual: p.y,
      regression: slope * p.x + intercept,
    }));
  }, [points, slope, intercept]);

  const config = {
    actual: { label: "Actual", color: "#8884d8" },
    regression: { label: "Regression", color: "#82ca9d" },
  } as const;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="text-lg font-semibold">
          Regression {type.replace("-", " ")}
        </div>
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
          config={config as any}
          className={className ?? "w-full h-80"}
        >
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="actual"
              stroke={"var(--color-actual)"}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="regression"
              stroke={"var(--color-regression)"}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
