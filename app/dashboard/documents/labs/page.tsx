"use client";

import EditableText from "@/components/editable-text";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Brain,
  ChartArea,
  ChartBar,
  ChartLine,
  ChartPie,
  ChartScatter,
  ChevronDown,
  ChevronUp,
  Code,
  Download,
  GripVertical,
  Plus,
  Save,
  Shapes,
  Sparkles,
  TableProperties,
  Trash2,
  Type,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
import TableVisual from "@/components/table-visual";
import ChartVisual from "@/components/chart-visual";
import ClassificationVisual from "@/components/classification-visual";
import ClusteringVisual from "@/components/clustering-visual";
import RegressionVisual from "@/components/regression-visual";
import CodeVisual from "@/components/code-visual";

export default function LabsPage() {
  const router = useRouter();
  const [contents, setContents] = useState<
    {
      type:
        | "text"
        | "table"
        | "chart"
        | "classification"
        | "clustering"
        | "regression"
        | "ai"
        | "code";
      content: any;
      referencedDocs?: {
        name?: string;
        url?: string;
        type?: string;
        error?: string;
      }[];
    }[]
  >([
    // text
    {
      type: "text",
      content: "<h1>Expense Report</h1><p>For the month of June 2024</p>",
    },
    // table
    {
      type: "table",
      content: {
        headers: ["Date", "Description", "Amount ($)"],
        rows: [
          ["2024-06-01", "Grocery Store", "-125.50"],
          ["2024-06-02", "Salary Deposit", "3,200.00"],
          ["2024-06-03", "Electric Bill", "-89.75"],
          ["2024-06-04", "Online Shopping", "-45.99"],
        ],
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // chart of summary
    {
      type: "chart",
      content: {
        type: "bar",
        data: {
          labels: [
            "Grocery Store",
            "Salary Deposit",
            "Electric Bill",
            "Online Shopping",
          ],
          datasets: [
            {
              label: "Expenses",
              data: [-125.5, 3200.0, -89.75, -45.99],
              backgroundColor: "rgba(255, 99, 132, 0.5)",
            },
          ],
        },
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // classification (random forest - hierarchical tree fake data)
    {
      type: "classification",
      content: {
        type: "random-forest",
        headers: ["id", "parent", "tree", "feature", "threshold", "label"],
        rows: [
          // Tree A: split by Amount ($) ≤ 0
          ["A1", "", "A", "Amount ($)", 0, ""],
          ["A2", "A1", "A", "", "", "Expense"],
          ["A3", "A1", "A", "", "", "Income"],
          // Tree B: placeholder split on Description
          ["B1", "", "B", "Description", "", ""],
          ["B2", "B1", "B", "", "", "Expense"],
          ["B3", "B1", "B", "", "", "Income"],
        ],
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // clustering (k-means scatter plot - fake data)
    {
      type: "clustering",
      content: {
        type: "k-means",
        points: [
          { x: 1, y: -125.5, cluster: "C1", label: "Grocery Store" },
          { x: 2, y: 3200.0, cluster: "C2", label: "Salary Deposit" },
          { x: 3, y: -89.75, cluster: "C1", label: "Electric Bill" },
          { x: 4, y: -45.99, cluster: "C1", label: "Online Shopping" },
          { x: 5, y: -230.0, cluster: "C1", label: "Car Repair" },
          { x: 6, y: 1500.0, cluster: "C2", label: "Bonus" },
        ],
        clusters: [
          { id: "C1", name: "Expenses", color: "#ef4444" },
          { id: "C2", name: "Income", color: "#22c55e" },
        ],
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // regression (linear regression - fake data)
    {
      type: "regression",
      content: {
        type: "linear-regression",
        points: [
          { x: 1, y: -125.5 },
          { x: 2, y: 3200.0 },
          { x: 3, y: -89.75 },
          { x: 4, y: -45.99 },
          { x: 5, y: -230.0 },
          { x: 6, y: 1500.0 },
        ],
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // code
    {
      type: "code",
      content: {
        language: "javascript",
        code: "const expenseReport = require('./expense-report-june-2024.pdf');\nconsole.log(expenseReport);",
      },
      referencedDocs: [
        {
          name: "Expense Report June 2024",
          url: "https://example.com/expense-report-june-2024.pdf",
          type: "pdf",
        },
      ],
    },
  ]);
  const [title, setTitle] = useState("Untitled");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [newText, setNewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (isPreview: boolean) => {};

  // Reorder & delete handlers for content items
  const handleMoveUp = (idx: number) => {
    setContents((prev) => {
      if (idx <= 0) return prev;
      const next = [...prev];
      const tmp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const handleMoveDown = (idx: number) => {
    setContents((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      const tmp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = tmp;
      return next;
    });
  };

  const handleDeleteItem = (idx: number) => {
    setContents((prev) => prev.filter((_, i) => i !== idx));
  };

  // Add item handlers for plus dropdown
  const addText = () => {
    setContents((prev) => [
      ...prev,
      { type: "text", content: "<p>Write here</p>" },
    ]);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/documents")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
              placeholder="Labs title..."
            />
          </div>
          <div className="flex items-center space-x-2">
            {/* {lastSaved && (
              <span className="text-sm text-muted-foreground">
                {isSaving
                  ? "Saving..."
                  : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )} */}

            <Button variant="link" className="text-muted-foreground" size="sm">
              <Sparkles className="h-4 w-4" />
            </Button>
            {
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>DOCX</DropdownMenuItem>
                  <DropdownMenuItem>PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl min-h-96 space-y-4 p-6">
        {contents.map((item, index) => (
          <div
            className="relative flex items-center space-x-4 group"
            key={index}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <GripVertical size={16} className="cursor-pointer" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleMoveUp(index)}>
                  <ChevronUp size={16} className="mr-2" />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDeleteItem(index)}>
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMoveDown(index)}>
                  <ChevronDown size={16} className="mr-2" />
                  Move down
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {item.type === "text" ? (
              <div className="flex-1">
                <EditableText
                  placeholder="Write text here"
                  value={item.content || ""}
                  onChange={(html) => {
                    setContents((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        content: html,
                      };
                      return next;
                    });
                  }}
                />
              </div>
            ) : item.type === "table" ? (
              <div className="w-full">
                <TableVisual
                  linkedResource={item.referencedDocs}
                  headers={item.content.headers}
                  rows={item.content.rows}
                />
              </div>
            ) : item.type === "chart" ? (
              <div className="w-full">
                <ChartVisual
                  linkedResource={item.referencedDocs}
                  type={item.content.type}
                  data={item.content.data}
                />
              </div>
            ) : item.type === "classification" ? (
              <div className="w-full">
                <ClassificationVisual
                  linkedResource={item.referencedDocs}
                  headers={item.content.headers}
                  rows={item.content.rows}
                />
              </div>
            ) : item.type === "clustering" ? (
              <div className="w-full">
                <ClusteringVisual
                  linkedResource={item.referencedDocs}
                  points={item.content.points}
                  clusters={item.content.clusters}
                />
              </div>
            ) : item.type === "regression" ? (
              <div className="w-full">
                <RegressionVisual
                  linkedResource={item.referencedDocs}
                  points={item.content.points}
                />
              </div>
            ) : item.type === "code" ? (
              <div className="w-full">
                <CodeVisual
                  linkedResource={item.referencedDocs}
                  language={item.content.language}
                  code={item.content.code}
                  onCodeChange={(newCode) => {
                    setContents((prev) => {
                      const next = [...prev];
                      next[index] = {
                        ...next[index],
                        content: {
                          ...next[index].content,
                          code: newCode,
                        },
                      };
                      return next;
                    });
                  }}
                />
              </div>
            ) : (
              <div className="w-full"></div>
            )}
          </div>
        ))}
        <div className="flex items-center space-x-2 group">
          {/* Plus dropdown to add new content item */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Plus size={16} className="cursor-pointer" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={addText}>
                <Type size={16} className="mr-2" /> Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addText}>
                <TableProperties size={16} className="mr-2" /> Table
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ChartArea size={16} className="mr-2" /> Charts
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Shapes size={16} className="mr-2" /> Classification
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ChartScatter size={16} className="mr-2" /> Clustering
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ChartLine size={16} className="mr-2" /> Regression
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Brain size={16} className="mr-2" /> AI Analyze
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Code size={16} className="mr-2" /> Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1">
            <EditableText
              placeholder="Write text here"
              value={newText}
              onChange={(html) => setNewText(html)}
              onSubmit={() => {
                const clean = (newText || "").trim();
                if (clean.length > 0) {
                  setContents((prev) => [
                    ...prev,
                    { type: "text", content: newText },
                  ]);
                  setNewText("");
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
