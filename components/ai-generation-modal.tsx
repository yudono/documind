"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string, type: string) => Promise<void>;
  generationType: string;
}

const documentTypes = {
  document: {
    title: 'AI Document Generator',
    description: 'Generate any type of document with AI assistance',
    placeholder: 'Describe what kind of document you want to create...',
    examples: ['Create a user manual for a mobile app', 'Write a technical specification document', 'Generate a company policy document']
  },
  business_proposal: {
    title: 'Business Proposal Generator',
    description: 'Create professional business proposals',
    placeholder: 'Describe your business proposal requirements...',
    examples: ['Software development proposal for e-commerce platform', 'Marketing campaign proposal for tech startup', 'Partnership proposal for sustainable energy project']
  },
  project_report: {
    title: 'Project Report Generator',
    description: 'Generate comprehensive project reports',
    placeholder: 'Describe your project and reporting requirements...',
    examples: ['Quarterly project status report', 'Software development milestone report', 'Research project final report']
  },
  meeting_minutes: {
    title: 'Meeting Minutes Generator',
    description: 'Create structured meeting minutes',
    placeholder: 'Describe the meeting type and key topics...',
    examples: ['Weekly team standup meeting', 'Board meeting for Q4 planning', 'Client project kickoff meeting']
  },
  email_template: {
    title: 'Email Template Generator',
    description: 'Create professional email templates',
    placeholder: 'Describe the email purpose and tone...',
    examples: ['Welcome email for new customers', 'Follow-up email after sales meeting', 'Project update email to stakeholders']
  },
  research_paper: {
    title: 'Research Paper Generator',
    description: 'Generate academic research paper structure',
    placeholder: 'Describe your research topic and requirements...',
    examples: ['AI impact on healthcare research paper', 'Climate change mitigation strategies', 'Digital transformation in education']
  },
  creative_writing: {
    title: 'Creative Writing Assistant',
    description: 'Start creative writing with AI assistance',
    placeholder: 'Describe your creative writing idea...',
    examples: ['Short story about time travel', 'Blog post about remote work benefits', 'Product description for innovative gadget']
  }
};

export default function AIGenerationModal({ isOpen, onClose, onGenerate, generationType }: AIGenerationModalProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');

  const currentType = documentTypes[generationType as keyof typeof documentTypes] || documentTypes.document;

  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
      setSelectedExample('');
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      await onGenerate(prompt, generationType);
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setSelectedExample(example);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            {currentType.title}
          </DialogTitle>
          <DialogDescription>
            {currentType.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Examples Section */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              <Sparkles className="h-4 w-4 inline mr-1" />
              Example Prompts
            </Label>
            <div className="grid gap-2">
              {currentType.examples.map((example, index) => (
                <Card 
                  key={index} 
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedExample === example ? 'ring-2 ring-blue-500 bg-accent' : ''
                  }`}
                  onClick={() => handleExampleClick(example)}
                >
                  <CardContent className="p-3">
                    <p className="text-sm text-muted-foreground">{example}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <Label htmlFor="prompt" className="text-sm font-medium mb-2 block">
              Your Prompt
            </Label>
            <Textarea
              id="prompt"
              placeholder={currentType.placeholder}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="min-w-[120px]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Bot className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}