'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, MessageSquare, Upload, Zap } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            AI Document Assistant
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Transform your document workflow with AI-powered management, generation, and analysis tools
          </p>
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            size="lg"
            className="px-8 py-3 text-lg font-semibold"
          >
            Sign in with Google
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Upload className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Upload and manage PDF, DOCX, and TXT files with ease
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Analyze Content</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                AI-powered document analysis and content extraction
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Generate Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create invoices, reports, and legal documents using AI
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>AI Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Interactive AI assistant for document-related tasks
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Ready to get started?
          </h2>
          <Button
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            variant="outline"
            size="lg"
            className="px-8 py-3 text-lg"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}