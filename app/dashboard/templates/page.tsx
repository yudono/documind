"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string | null;
  thumbnail: string | null;
  downloadCount: number;
  size: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "docx":
      return <FileText className="h-5 w-5 text-blue-600" />;
    case "xlsx":
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    case "pptx":
      return <Presentation className="h-5 w-5 text-orange-600" />;
    default:
      return <FileText className="h-5 w-5 text-gray-600" />;
  }
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "Unknown size";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};

export default function TemplatePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, selectedType]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== "all")
        params.append("category", selectedCategory);
      if (selectedType !== "all") params.append("type", selectedType);

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Error",
        description: "Failed to load templates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/dashboard/templates/${templateId}`);
  };

  const handleDownload = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/download`);
      if (!response.ok) throw new Error("Failed to download template");

      const data = await response.json();

      // Open the download URL in a new tab
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }

      toast({
        title: "Download Started",
        description: `${templateName} download has been initiated.`,
      });
    } catch (error) {
      console.error("Error downloading template:", error);
      toast({
        title: "Error",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description &&
        template.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const categories = [
    "all",
    "business",
    "marketing",
    "finance",
    "sales",
    "hr",
    "operations",
    "education",
  ];
  const types = ["all", "docx", "xlsx", "pptx"];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold">Templates</h1>
              <p className="text-sm text-muted-foreground">
                Find templates that fit your needs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === "all"
                      ? "All Categories"
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === "all" ? "All Types" : type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  {/**<div className="h-32 bg-muted rounded mb-4"></div> **/}
                  <div className="h-3 bg-muted rounded w-full mb-2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? "Try adjusting your search terms or filters."
                : "No templates available at the moment."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getFileIcon(template.type)}
                      <CardTitle className="text-sm font-medium line-clamp-1">
                        {template.name}
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {template.type.toUpperCase()}
                    </Badge>
                  </div>
                  {template.description && (
                    <CardDescription className="text-xs line-clamp-2">
                      {template.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {/** {template.thumbnail && (
                    <div className="mb-3">
                      <img
                        src={
                          template.thumbnail || "https://placehold.co/600x400"
                        }
                        onError={(e: any) => {
                          e.target.src = "https://placehold.co/600x400";
                        }}
                        alt={template.name}
                        className="w-full h-32 object-cover rounded-md bg-muted"
                      />
                    </div>
                  )}**/}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                    <span>{template.downloadCount} downloads</span>
                    <span>{formatFileSize(template.size)}</span>
                  </div>
                  {template.category && (
                    <Badge variant="outline" className="text-xs mb-3">
                      {template.category}
                    </Badge>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUseTemplate(template.id)}
                      className="flex-1"
                      size="sm"
                    >
                      Use Template
                    </Button>
                    <Button
                      onClick={() => handleDownload(template.id, template.name)}
                      variant="outline"
                      size="sm"
                      className="px-3"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
