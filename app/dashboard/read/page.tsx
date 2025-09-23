'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Brain, 
  BarChart3,
  Key,
  Clock,
  FileSearch,
  Sparkles,
  Download,
  Share
} from 'lucide-react';

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readingTime: number;
  wordCount: number;
  topics: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  analysis?: AnalysisResult;
}

export default function ReadDocumentPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsAnalyzing(true);
    
    // Simulate file processing and analysis
    setTimeout(() => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => {
        const mockContent = `This is sample content extracted from ${file.name}. In a real implementation, this would contain the actual text extracted from the PDF, DOCX, or TXT file using appropriate parsing libraries.

The document contains important information about business processes, financial data, and strategic planning. Key sections include executive summary, market analysis, financial projections, and recommendations for future growth.

This analysis demonstrates how the AI system would process and understand document content to provide meaningful insights and summaries.`;

        const mockAnalysis: AnalysisResult = {
          summary: `This document appears to be a ${file.type.includes('pdf') ? 'PDF report' : file.type.includes('word') ? 'Word document' : 'text file'} containing business-related content. The analysis reveals key insights about strategic planning and operational efficiency.`,
          keyPoints: [
            'Strategic business planning and market analysis',
            'Financial projections and budget considerations',
            'Operational efficiency recommendations',
            'Risk assessment and mitigation strategies',
            'Future growth opportunities and challenges'
          ],
          sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
          readingTime: Math.floor(Math.random() * 10) + 5,
          wordCount: Math.floor(Math.random() * 2000) + 500,
          topics: ['Business Strategy', 'Financial Planning', 'Market Analysis', 'Operations']
        };

        return {
          id: Date.now().toString() + index,
          name: file.name,
          type: file.type,
          size: file.size,
          content: mockContent,
          analysis: mockAnalysis
        };
      });
      
      setFiles(prev => [...prev, ...newFiles]);
      if (newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      }
      setIsAnalyzing(false);
    }, 3000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      onDrop(Array.from(selectedFiles));
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Read & Analyze Documents</h1>
        <p className="text-slate-600">Upload documents for AI-powered analysis and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Upload and File List */}
        <div className="lg:col-span-1">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Upload Document</CardTitle>
              <CardDescription>
                Upload a file to analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                  }
                  ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                {isAnalyzing ? (
                  <div>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-slate-600">Analyzing...</p>
                  </div>
                ) : isDragActive ? (
                  <p className="text-sm text-slate-600">Drop files here...</p>
                ) : (
                  <div>
                    <p className="text-sm text-slate-600 mb-1">
                      Drop files or{' '}
                      <button 
                        onClick={handleFileSelect}
                        className="text-primary hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-slate-400">PDF, DOCX, TXT</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* File List */}
          {files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyzed Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`
                        p-3 border rounded-lg cursor-pointer transition-colors
                        ${selectedFile?.id === file.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-lg">{getFileIcon(file.type)}</div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-slate-900 truncate text-sm">{file.name}</h3>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analysis Results */}
        <div className="lg:col-span-3">
          {selectedFile ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <FileSearch className="h-5 w-5 mr-2 text-primary" />
                      {selectedFile.name}
                    </CardTitle>
                    <CardDescription>AI Analysis Results</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="analysis" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="analysis" className="space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium">{selectedFile.analysis?.readingTime} min</p>
                              <p className="text-xs text-slate-500">Reading Time</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium">{selectedFile.analysis?.wordCount}</p>
                              <p className="text-xs text-slate-500">Words</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4 text-purple-600" />
                            <div>
                              <Badge className={`text-xs ${getSentimentColor(selectedFile.analysis?.sentiment || 'neutral')}`}>
                                {selectedFile.analysis?.sentiment}
                              </Badge>
                              <p className="text-xs text-slate-500">Sentiment</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-2">
                            <Key className="h-4 w-4 text-orange-600" />
                            <div>
                              <p className="text-sm font-medium">{selectedFile.analysis?.topics.length}</p>
                              <p className="text-xs text-slate-500">Topics</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <Brain className="h-5 w-5 mr-2 text-primary" />
                          AI Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-slate-700 leading-relaxed">
                          {selectedFile.analysis?.summary}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Key Points */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <Key className="h-5 w-5 mr-2 text-primary" />
                          Key Points
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {selectedFile.analysis?.keyPoints.map((point, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-slate-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Topics */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Topics Identified</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedFile.analysis?.topics.map((topic, index) => (
                            <Badge key={index} variant="secondary">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="content">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Document Content</CardTitle>
                        <CardDescription>Extracted text from the document</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-96 w-full border rounded-lg p-4">
                          <div className="prose prose-sm max-w-none">
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {selectedFile.content}
                            </p>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="insights">
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center">
                            <Sparkles className="h-5 w-5 mr-2 text-primary" />
                            AI Insights
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Document Structure</h4>
                            <p className="text-sm text-slate-600">
                              The document follows a well-organized structure with clear sections and logical flow.
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Content Quality</h4>
                            <div className="flex items-center space-x-2">
                              <Progress value={85} className="flex-1" />
                              <span className="text-sm text-slate-600">85%</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Readability Score</h4>
                            <div className="flex items-center space-x-2">
                              <Progress value={78} className="flex-1" />
                              <span className="text-sm text-slate-600">78%</span>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">Recommendations</h4>
                            <ul className="text-sm text-slate-600 space-y-1">
                              <li>• Consider adding more visual elements to improve engagement</li>
                              <li>• Some sections could benefit from clearer headings</li>
                              <li>• Overall structure is well-organized and professional</li>
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileSearch className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No Document Selected</h3>
                  <p className="text-slate-500 mb-4">Upload a document to start analyzing</p>
                  <Button onClick={handleFileSelect}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}