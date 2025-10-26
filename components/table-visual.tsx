"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import ResourceFile from "@/components/resource-file";
import { cn } from "@/lib/utils";

type TableVisualProps = {
  headers: (string | number)[];
  rows: (string | number)[][];
  className?: string;
  dense?: boolean;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
};

export default function TableVisual({
  headers,
  rows,
  className,
  dense = false,
  linkedResource,
}: TableVisualProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="text-lg font-semibold">Tables</div>
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
        <div className={cn(`w-full overflow-x-auto`, className ?? "")}>
          <Table className={dense ? "text-sm" : "text-base"}>
            <TableHeader>
              <TableRow>
                {headers?.map((h, idx) => (
                  <TableHead
                    key={idx}
                    className="bg-muted whitespace-nowrap text-xs"
                  >
                    {String(h)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.map((row, rIdx) => (
                <TableRow key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <TableCell key={cIdx} className="whitespace-nowrap text-xs">
                      {String(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
