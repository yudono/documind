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
import TableVisual from "@/components/table-visual";
import ChartVisual from "@/components/chart-visual";
import ClassificationVisual from "@/components/classification-visual";
import ClusteringVisual from "@/components/clustering-visual";
import RegressionVisual from "@/components/regression-visual";
import CodeVisual from "@/components/code-visual";
import AIChatSidebar from "@/components/ai-chat-sidebar";
import { cn } from "@/lib/utils";

export default function LabsPage() {
  const router = useRouter();
  const [showChatbot, setShowChatbot] = useState(false);
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
    // Marketing summary – headline and context
    {
      type: "text",
      content:
        "<h1>Marketing Summary</h1><p>Q4 2024 advertising performance overview.</p><p>This dashboard helps determine if ads are working using CTR, CPA, and ROAS.</p>",
    },
    // Campaign performance table
    {
      type: "table",
      content: {
        headers: [
          "Campaign",
          "Date",
          "Impressions",
          "Clicks",
          "CTR (%)",
          "Conversions",
          "Spend ($)",
          "Revenue ($)",
          "CPA ($)",
          "ROAS",
        ],
        rows: [
          [
            "Search - Brand",
            "2024-10-01",
            "120,000",
            "7,200",
            "6.00",
            "540",
            "$12,000",
            "$60,000",
            "$22.22",
            "5.00",
          ],
          [
            "Search - NonBrand",
            "2024-10-01",
            "95,000",
            "4,275",
            "4.50",
            "258",
            "$10,500",
            "$28,000",
            "$40.70",
            "2.67",
          ],
          [
            "Social - Prospecting",
            "2024-10-01",
            "150,000",
            "3,000",
            "2.00",
            "180",
            "$8,000",
            "$20,000",
            "$44.44",
            "2.50",
          ],
          [
            "Social - Retargeting",
            "2024-10-01",
            "80,000",
            "2,800",
            "3.50",
            "350",
            "$6,500",
            "$32,000",
            "$18.57",
            "4.92",
          ],
          [
            "Display - Awareness",
            "2024-10-01",
            "300,000",
            "1,500",
            "0.50",
            "75",
            "$5,000",
            "$8,000",
            "$66.67",
            "1.60",
          ],
        ],
      },
      referencedDocs: [
        {
          name: "Marketing Analytics Report Q4 2024",
          url: "https://example.com/marketing-analytics-q4-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // ROAS by campaign (bar)
    {
      type: "chart",
      content: {
        type: "bar",
        data: {
          labels: [
            "Search - Brand",
            "Search - NonBrand",
            "Social - Prospecting",
            "Social - Retargeting",
            "Display - Awareness",
          ],
          datasets: [
            {
              label: "ROAS",
              data: [5.0, 2.67, 2.5, 4.92, 1.6],
              backgroundColor: "rgba(34, 197, 94, 0.5)",
            },
          ],
        },
      },
      referencedDocs: [
        {
          name: "Marketing Analytics Report Q4 2024",
          url: "https://example.com/marketing-analytics-q4-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // Conversions trend (line)
    {
      type: "chart",
      content: {
        type: "line",
        data: {
          labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
          datasets: [
            {
              label: "Conversions",
              data: [300, 360, 420, 480],
              borderColor: "rgba(59, 130, 246, 1)",
              backgroundColor: "rgba(59, 130, 246, 0.2)",
            },
          ],
        },
      },
    },
    // Campaign effectiveness classification (random forest)
    {
      type: "classification",
      content: {
        type: "random-forest",
        headers: ["id", "parent", "tree", "feature", "threshold", "label"],
        rows: [
          ["A1", "", "A", "ROAS", 3.0, ""],
          ["A2", "A1", "A", "", "", "Effective"],
          ["A3", "A1", "A", "", "", "Needs Optimization"],
          ["B1", "", "B", "CPA ($)", 30.0, ""],
          ["B2", "B1", "B", "", "", "Efficient"],
          ["B3", "B1", "B", "", "", "Inefficient"],
        ],
      },
      referencedDocs: [
        {
          name: "Marketing Analytics Report Q4 2024",
          url: "https://example.com/marketing-analytics-q4-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // CTR vs CPA clustering (k-means)
    {
      type: "clustering",
      content: {
        type: "k-means",
        points: [
          { x: 6.0, y: 22.22, cluster: "C1", label: "Search - Brand" },
          { x: 4.5, y: 40.7, cluster: "C2", label: "Search - NonBrand" },
          { x: 2.0, y: 44.44, cluster: "C2", label: "Social - Prospecting" },
          { x: 3.5, y: 18.57, cluster: "C1", label: "Social - Retargeting" },
          { x: 0.5, y: 66.67, cluster: "C2", label: "Display - Awareness" },
        ],
        clusters: [
          { id: "C1", name: "High Efficiency", color: "#22c55e" },
          { id: "C2", name: "Low Efficiency", color: "#ef4444" },
        ],
      },
    },
    // Spend vs Conversions regression (linear)
    {
      type: "regression",
      content: {
        type: "linear-regression",
        points: [
          { x: 12000, y: 540 },
          { x: 10500, y: 258 },
          { x: 8000, y: 180 },
          { x: 6500, y: 350 },
          { x: 5000, y: 75 },
        ],
      },
      referencedDocs: [
        {
          name: "Marketing Analytics Report Q4 2024",
          url: "https://example.com/marketing-analytics-q4-2024.pdf",
          type: "pdf",
        },
      ],
    },
    // Code snippet: quick KPIs calculation
    {
      type: "code",
      content: {
        language: "javascript",
        code:
          "const summary = { impressions: 745000, clicks: 18875, conversions: 1403, spend: 42000, revenue: 148000 };\n" +
          "const ctr = (summary.clicks / summary.impressions) * 100;\n" +
          "const cpa = summary.spend / Math.max(summary.conversions, 1);\n" +
          "const roas = summary.revenue / Math.max(summary.spend, 1);\n" +
          "console.log({ CTR: ctr.toFixed(2) + '%', CPA: '$' + cpa.toFixed(2), ROAS: roas.toFixed(2) });",
      },
      referencedDocs: [
        {
          name: "Marketing Analytics Report Q4 2024",
          url: "https://example.com/marketing-analytics-q4-2024.pdf",
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

  const addTable = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "table",
        content: {
          headers: ["Campaign", "Metric", "Value"],
          rows: [
            ["Search - Brand", "ROAS", "5.00"],
            ["Social - Retargeting", "CPA ($)", "18.57"],
            ["Display - Awareness", "CTR (%)", "0.50"],
          ],
        },
      },
    ]);
  };

  const addChart = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "chart",
        content: {
          type: "bar",
          data: {
            labels: ["Brand", "NonBrand", "Retargeting"],
            datasets: [
              {
                label: "ROAS",
                data: [5.0, 2.67, 4.92],
                backgroundColor: "rgba(34, 197, 94, 0.5)",
              },
            ],
          },
        },
      },
    ]);
  };

  const addClassification = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "classification",
        content: {
          type: "random-forest",
          headers: ["id", "parent", "tree", "feature", "threshold", "label"],
          rows: [
            ["A1", "", "A", "ROAS", 3.0, ""],
            ["A2", "A1", "A", "", "", "Effective"],
            ["A3", "A1", "A", "", "", "Needs Optimization"],
          ],
        },
      },
    ]);
  };

  const addClustering = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "clustering",
        content: {
          type: "k-means",
          points: [
            { x: 6.0, y: 22.22, cluster: "C1", label: "Brand" },
            { x: 3.5, y: 18.57, cluster: "C1", label: "Retargeting" },
            { x: 0.5, y: 66.67, cluster: "C2", label: "Display" },
          ],
          clusters: [
            { id: "C1", name: "High Efficiency", color: "#22c55e" },
            { id: "C2", name: "Low Efficiency", color: "#ef4444" },
          ],
        },
      },
    ]);
  };

  const addRegression = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "regression",
        content: {
          type: "linear-regression",
          points: [
            { x: 12000, y: 540 },
            { x: 6500, y: 350 },
            { x: 5000, y: 75 },
          ],
        },
      },
    ]);
  };

  const addAI = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "ai",
        content: {
          prompt: "Analyze marketing performance and recommend optimizations",
          result: null,
        },
      },
    ]);
  };

  const addCode = () => {
    setContents((prev) => [
      ...prev,
      {
        type: "code",
        content: {
          language: "javascript",
          code:
            "const clicks=18875,impressions=745000,conversions=1403,spend=42000,revenue=148000;\n" +
            "const ctr=(clicks/impressions)*100;\n" +
            "const cpa=spend/Math.max(conversions,1);\n" +
            "const roas=revenue/Math.max(spend,1);\n" +
            "console.log({CTR:ctr.toFixed(2)+'%',CPA:'$'+cpa.toFixed(2),ROAS:roas.toFixed(2)});",
        },
      },
    ]);
  };

  return (
    <div className="h-screen bg-background">
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

            <Button
              variant="link"
              className="text-muted-foreground"
              size="sm"
              onClick={() => {
                const next = !showChatbot;
                setShowChatbot(next);
              }}
            >
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
      <div className="flex flex-row w-full">
        <div className="flex-1 p-4 rounded-xl min-h-96 space-y-4 p-6">
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
                    type={item.content.type}
                    linkedResource={item.referencedDocs}
                    headers={item.content.headers}
                    rows={item.content.rows}
                  />
                </div>
              ) : item.type === "clustering" ? (
                <div className="w-full">
                  <ClusteringVisual
                    type={item.content.type}
                    linkedResource={item.referencedDocs}
                    points={item.content.points}
                    clusters={item.content.clusters}
                  />
                </div>
              ) : item.type === "regression" ? (
                <div className="w-full">
                  <RegressionVisual
                    type={item.content.type}
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
                <DropdownMenuItem onClick={addTable}>
                  <TableProperties size={16} className="mr-2" /> Table
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addChart}>
                  <ChartArea size={16} className="mr-2" /> Charts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addClassification}>
                  <Shapes size={16} className="mr-2" /> Classification
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addClustering}>
                  <ChartScatter size={16} className="mr-2" /> Clustering
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addRegression}>
                  <ChartLine size={16} className="mr-2" /> Regression
                </DropdownMenuItem>

                <DropdownMenuItem onClick={addAI}>
                  <Brain size={16} className="mr-2" /> AI Analyze
                </DropdownMenuItem>
                <DropdownMenuItem onClick={addCode}>
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

        <div
          className={cn(
            "w-80 border-l flex flex-col",
            !showChatbot && "hidden"
          )}
        >
          <AIChatSidebar
            isVisible={true}
            onToggleVisibility={() => setShowChatbot(false)}
            documentContent={""}
            inline={true}
            onApplyHtml={() => {}}
            documentId={""}
          />
        </div>
      </div>
    </div>
  );
}
