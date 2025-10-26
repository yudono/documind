"use client";

import React, { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import ResourceFile from "./resource-file";

export type ClassificationVisualProps = {
  headers: (string | number)[];
  rows: (string | number)[][];
  className?: string;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
  dense?: boolean;
};

function isNumeric(n: unknown) {
  return (
    typeof n === "number" ||
    (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n)))
  );
}

function detectFeatureImportance(
  headers: (string | number)[],
  rows: (string | number)[][]
) {
  const lower = headers.map((h) => String(h).toLowerCase());
  const fiIdx = {
    feature: lower.indexOf("feature"),
    importance: lower.indexOf("importance"),
  };
  const valid = fiIdx.feature !== -1 && fiIdx.importance !== -1;
  if (!valid) return null;
  const data = rows
    .map((r) => ({
      feature: String(r[fiIdx.feature] ?? ""),
      importance: Number(r[fiIdx.importance] ?? 0),
    }))
    .filter((d) => d.feature && !Number.isNaN(d.importance));
  return data.length ? data : null;
}

function detectConfusionMatrix(
  headers: (string | number)[],
  rows: (string | number)[][]
) {
  const colCount = headers.length;
  const rowCount = rows.length;
  if (rowCount === 0 || colCount === 0) return null;
  const firstRow = rows[0];
  const hasRowLabel =
    firstRow.length === colCount + 1 && !isNumeric(firstRow[0]);
  const matrixCols = hasRowLabel ? colCount : firstRow.length;
  if (matrixCols !== colCount) return null;
  const matrix: number[][] = [];
  const rowLabels: string[] = [];
  for (let i = 0; i < rowCount; i++) {
    const r = rows[i];
    const cells = hasRowLabel ? r.slice(1) : r;
    if (cells.length !== colCount || !cells.every((c) => isNumeric(c)))
      return null;
    matrix.push(cells.map((c) => Number(c)));
    rowLabels.push(String(hasRowLabel ? r[0] : headers[i] ?? i));
  }
  const colLabels = headers.map((h) => String(h));
  return { matrix, rowLabels, colLabels };
}

// ---- Random Forest hierarchical (tree) detection and rendering ----

type RawNode = {
  id: string;
  parentId: string | null;
  treeId: string;
  feature?: string;
  threshold?: number | null;
  label?: string;
};

type TreeNode = RawNode & { children: TreeNode[]; depth: number };

type PositionedNode = TreeNode & { x: number; y: number };

type Forest = { trees: { rootNodes: TreeNode[]; treeId: string }[] };

function detectForest(
  headers: (string | number)[],
  rows: (string | number)[][]
): Forest | null {
  const lower = headers.map((h) => String(h).toLowerCase());
  const idx = {
    id: lower.indexOf("id"),
    parent: lower.indexOf("parent"),
    tree: lower.indexOf("tree"),
    feature: lower.indexOf("feature"),
    threshold: lower.indexOf("threshold"),
    label: lower.indexOf("label"),
  };
  if (idx.id === -1 || idx.parent === -1) return null;

  const byTree: Record<string, Map<string, TreeNode>> = {};
  const parentIdsByTree: Record<string, Set<string>> = {};

  for (const r of rows) {
    const treeId = idx.tree !== -1 ? String(r[idx.tree]) : "default";
    const id = String(r[idx.id]);
    const parentRaw = r[idx.parent];
    const parentId =
      parentRaw == null || String(parentRaw) === "" ? null : String(parentRaw);
    const feature =
      idx.feature !== -1 ? String(r[idx.feature] ?? "") : undefined;
    const thresholdVal = idx.threshold !== -1 ? r[idx.threshold] : undefined;
    const threshold =
      thresholdVal == null || String(thresholdVal) === ""
        ? null
        : Number(thresholdVal);
    const label = idx.label !== -1 ? String(r[idx.label] ?? "") : undefined;

    if (!byTree[treeId]) byTree[treeId] = new Map();
    if (!parentIdsByTree[treeId]) parentIdsByTree[treeId] = new Set();

    byTree[treeId].set(id, {
      id,
      parentId,
      treeId,
      feature,
      threshold,
      label,
      children: [],
      depth: 0,
    });
    if (parentId) parentIdsByTree[treeId].add(parentId);
  }

  // Link children and compute roots
  const trees: { rootNodes: TreeNode[]; treeId: string }[] = [];
  for (const [treeId, map] of Object.entries(byTree)) {
    const rootNodes: TreeNode[] = [];
    // Link children
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId)) {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(node);
      }
    });
    // Collect roots
    map.forEach((node) => {
      if (!node.parentId || !map.has(node.parentId)) rootNodes.push(node);
    });

    // Assign depth via BFS from each root
    const queue: TreeNode[] = [];
    for (const root of rootNodes) {
      root.depth = 0;
      queue.push(root);
    }
    while (queue.length) {
      const cur = queue.shift()!;
      for (const child of cur.children) {
        child.depth = cur.depth + 1;
        queue.push(child);
      }
    }

    trees.push({ rootNodes, treeId });
  }

  if (!trees.length) return null;
  return { trees };
}

function layoutTree(rootNodes: TreeNode[]) {
  // Compute levels
  const levels: TreeNode[][] = [];
  const visitQueue = [...rootNodes];
  while (visitQueue.length) {
    const node = visitQueue.shift()!;
    if (!levels[node.depth]) levels[node.depth] = [];
    levels[node.depth].push(node);
    for (const child of node.children) visitQueue.push(child);
  }
  const levelGap = 100;
  const nodeWidth = 140;
  const nodeHeight = 44;
  const hGap = 40;
  const maxCount = Math.max(...levels.map((l) => l.length));
  const svgWidth = Math.max(600, maxCount * (nodeWidth + hGap) + hGap);
  const svgHeight = levels.length * (nodeHeight + levelGap) + hGap;

  const positioned: PositionedNode[] = [];
  levels.forEach((nodesAtLevel, depth) => {
    const totalWidth = nodesAtLevel.length * (nodeWidth + hGap) - hGap;
    const startX = (svgWidth - totalWidth) / 2;
    nodesAtLevel.forEach((n, i) => {
      const x = startX + i * (nodeWidth + hGap);
      const y = hGap + depth * (nodeHeight + levelGap);
      positioned.push({ ...n, x, y });
    });
  });

  // Build edges
  const positionedById = new Map(positioned.map((n) => [n.id, n]));
  const edges: { from: PositionedNode; to: PositionedNode }[] = [];
  for (const n of positioned) {
    if (n.parentId && positionedById.has(n.parentId)) {
      edges.push({ from: positionedById.get(n.parentId)!, to: n });
    }
  }

  return {
    nodes: positioned,
    edges,
    svgWidth,
    svgHeight,
    nodeWidth,
    nodeHeight,
  };
}

export default function ClassificationVisual({
  headers,
  rows,
  className,
  linkedResource,
  dense,
}: ClassificationVisualProps) {
  const featureImportance = detectFeatureImportance(headers, rows);
  const confusion = detectConfusionMatrix(headers, rows);
  const forest = useMemo(() => detectForest(headers, rows), [headers, rows]);

  // Prefer hierarchical diagram when forest structure is provided
  if (forest) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="text-lg font-semibold">Classification</div>
          <div className="bg-neutral-100 p-4 rounded-lg">
            <div className="text-sm font-semibold text-neutral-500">Linked Documents</div>
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
        <CardContent className={cn("space-y-8", dense && "space-y-4")}>
          {forest.trees.map((t, idx) => {
            const layout = layoutTree(t.rootNodes);
            return (
              <div
                key={t.treeId + "-" + idx}
                className="w-full overflow-x-auto"
              >
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                  Tree {typeof t.treeId === "string" ? t.treeId : idx + 1}
                </div>
                <svg
                  width={layout.svgWidth}
                  height={layout.svgHeight}
                  className="border rounded-md bg-white"
                >
                  {/* edges */}
                  {layout.edges.map((e, i) => (
                    <line
                      key={i}
                      x1={e.from.x + layout.nodeWidth / 2}
                      y1={e.from.y + layout.nodeHeight}
                      x2={e.to.x + layout.nodeWidth / 2}
                      y2={e.to.y}
                      stroke="#9ca3af"
                      strokeWidth={1.5}
                    />
                  ))}
                  {/* nodes */}
                  {layout.nodes.map((n) => {
                    const isLeaf = !n.children.length;
                    const fill = isLeaf ? "#ecfeff" : "#eef2ff"; // cyan-50 vs indigo-50
                    const stroke = isLeaf ? "#06b6d4" : "#4f46e5"; // cyan-600 vs indigo-600
                    const text = isLeaf
                      ? n.label
                        ? `label: ${n.label}`
                        : "leaf"
                      : n.feature
                      ? n.threshold != null
                        ? `${n.feature} ≤ ${n.threshold}`
                        : `${n.feature}`
                      : "split";
                    return (
                      <g key={n.id}>
                        <rect
                          x={n.x}
                          y={n.y}
                          width={layout.nodeWidth}
                          height={layout.nodeHeight}
                          rx={8}
                          fill={fill}
                          stroke={stroke}
                          strokeWidth={1.5}
                        />
                        <text
                          x={n.x + 8}
                          y={n.y + 18}
                          fontSize={12}
                          fill="#111827"
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })}


        </CardContent>
      </Card>
    );
  }

  // Force hierarchical view: if no forest detected, show a minimal note
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="text-lg font-semibold">Classification</div>
        <div className="bg-neutral-100 p-4 rounded-lg">
          <div className="text-sm font-semibold text-neutral-500">Linked Documents</div>
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
      <CardContent>
        <div className="text-sm text-muted-foreground">No hierarchical data found.</div>
      </CardContent>
    </Card>
  );
}
