'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Receipt, 
  Scale, 
  BarChart3,
  Mail,
  Plus
} from 'lucide-react';

const documentTemplates = [
  {
    id: 'invoice',
    name: 'Invoice',
    description: 'Professional invoice template',
    icon: Receipt,
    fields: ['client_name', 'service_description', 'amount'],
  },
  {
    id: 'legal',
    name: 'Legal Document',
    description: 'Legal agreement or contract',
    icon: Scale,
    fields: ['party_a', 'party_b', 'terms'],
  },
  {
    id: 'report',
    name: 'Business Report',
    description: 'Comprehensive business analysis',
    icon: BarChart3,
    fields: ['report_title', 'executive_summary', 'data_points'],
  },
  {
    id: 'letter',
    name: 'Formal Letter',
    description: 'Professional correspondence',
    icon: Mail,
    fields: ['recipient', 'subject', 'message'],
  },
];

export default function CreateDocumentPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [referenceDocuments, setReferenceDocuments] = useState<string[]>([]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setFormData({});
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateDocument = async () => {
    setIsGenerating(true);
    
    // Prepare template data for chat
    const templateData = {
      template: selectedTemplate,
      templateName: selectedTemplateData?.name,
      formData: formData,
      referenceDocuments: referenceDocuments
    };
    
    // Encode template data as URL parameters
    const params = new URLSearchParams({
      mode: 'template',
      data: JSON.stringify(templateData)
    });
    
    // Redirect to chat with template data
    window.location.href = `/dashboard/chat?${params.toString()}`;
  };

  const selectedTemplateData = documentTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Document</h1>
        <p className="text-slate-600">Generate professional documents using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>Choose a template to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {documentTemplates.map((template) => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-colors
                      ${selectedTemplate === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-200 hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-medium text-slate-900">{template.name}</h3>
                        <p className="text-sm text-slate-500">{template.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
                <CardDescription>
                  Fill in the information for your {selectedTemplateData?.name.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Reference Documents */}
                <div>
                  <Label className="text-base font-medium">Reference Documents (Optional)</Label>
                  <p className="text-sm text-slate-500 mb-3">
                    Select previously uploaded documents to use as reference
                  </p>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reference documents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doc1">Business Plan 2024.pdf</SelectItem>
                      <SelectItem value="doc2">Company Profile.docx</SelectItem>
                      <SelectItem value="doc3">Previous Invoice.pdf</SelectItem>
                    </SelectContent>
                  </Select>
                  {referenceDocuments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {referenceDocuments.map((doc) => (
                        <Badge key={doc} variant="secondary">
                          {doc}
                          <button 
                            onClick={() => setReferenceDocuments(prev => prev.filter(d => d !== doc))}
                            className="ml-2 text-xs"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dynamic Form Fields */}
                <div className="space-y-4">
                  {selectedTemplateData?.fields.map((field) => (
                    <div key={field}>
                      <Label htmlFor={field} className="capitalize">
                        {field.replace('_', ' ')}
                      </Label>
                      {field.includes('description') || field.includes('summary') || field.includes('terms') ? (
                        <Textarea
                          id={field}
                          placeholder={`Enter ${field.replace('_', ' ')}`}
                          value={formData[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className="mt-1"
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={field}
                          placeholder={`Enter ${field.replace('_', ' ')}`}
                          value={formData[field] || ''}
                          onChange={(e) => handleInputChange(field, e.target.value)}
                          className="mt-1"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Additional Instructions */}
                <div>
                  <Label htmlFor="instructions">Additional Instructions</Label>
                  <Textarea
                    id="instructions"
                    placeholder="Any specific requirements or style preferences..."
                    value={formData.instructions || ''}
                    onChange={(e) => handleInputChange('instructions', e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <Button
                  onClick={generateDocument}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating Document...
                    </div>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Select a template to get started</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}