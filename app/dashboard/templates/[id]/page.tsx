'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'time' | 'select';
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  thumbnail: string;
  previewUrl?: string;
  instructions?: string;
  templateFields?: {
    fields: TemplateField[];
    placeholders: Record<string, string>;
  };
}

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      
      const data = await response.json();
      setTemplate(data);
      
      // Initialize form data with default values
      if (data.templateFields?.fields) {
        const initialData: Record<string, any> = {};
        data.templateFields.fields.forEach((field: TemplateField) => {
          initialData[field.name] = '';
        });
        setFormData(initialData);
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!template) return;

    // Validate required fields
    const requiredFields = template.templateFields?.fields.filter(field => field.required) || [];
    const missingFields = requiredFields.filter(field => !formData[field.name] || formData[field.name].toString().trim() === '');
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }

    setGenerating(true);

    try {
      const response = await fetch(`/api/templates/${template.id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          aiEnhanced
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate document');
      }

      const result = await response.json();
      
      toast.success('Document generated successfully!');
      
      // Download the generated document
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
      
      // Redirect to documents page or show success message
      router.push('/dashboard/documents');
      
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const renderField = (field: TemplateField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.name}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="min-h-[100px]"
          />
        );
      
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleInputChange(field.name, val)}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            id={field.name}
            type={field.type}
            value={value}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Template not found</h1>
        <Button onClick={() => router.push('/dashboard/templates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/templates')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        
        <div className="flex items-start gap-6">
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-32 h-24 object-cover rounded-lg border"
          />
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
            <p className="text-muted-foreground mb-4">{template.description}</p>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{template.type?.toUpperCase() || 'UNKNOWN'}</Badge>
              <Badge variant="outline">{template.category || 'Uncategorized'}</Badge>
            </div>
            
            {template.instructions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Instructions</h3>
                <p className="text-blue-800 text-sm">{template.instructions}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preview */}
        {template.previewUrl && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <img
                  src={template.previewUrl}
                  alt="Template Preview"
                  className="w-full rounded-lg border"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Form */}
        <div className={template.previewUrl ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate Document
              </CardTitle>
              <CardDescription>
                Fill in the form below to generate your document from this template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {template.templateFields?.fields.map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name} className="flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {renderField(field)}
                  </div>
                ))}

                {/* AI Enhancement Option */}
                <div className="border-t pt-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="aiEnhanced"
                      checked={aiEnhanced}
                      onChange={(e) => setAiEnhanced(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="aiEnhanced" className="flex items-center gap-2 cursor-pointer">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Enhance with AI suggestions
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Let AI improve and optimize your content for better results
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={generating}
                    className="flex-1"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Generate Document
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}