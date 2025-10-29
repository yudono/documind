"use client";

import { Upload, Brain, FileText, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: Upload,
    title: "Smart Upload",
    description:
      "Upload PDF, DOCX, and TXT files with intelligent parsing and automatic categorization",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description:
      "Advanced AI-powered document analysis with content extraction and insights",
    gradient: "from-secondary/10 to-secondary/5",
  },
  {
    icon: FileText,
    title: "Document Generation",
    description:
      "Create professional invoices, reports, and legal documents using AI templates",
    gradient: "from-primary/10 to-primary/5",
  },
  {
    icon: MessageSquare,
    title: "AI Chat Assistant",
    description:
      "Interactive AI assistant for document-related tasks and intelligent conversations",
    gradient: "from-secondary/10 to-secondary/5",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-display font-bold">
            Everything You Need for{" "}
            <span className="text-gradient">Smart Documents</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful AI-driven features designed to revolutionize how you work
            with documents
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="glass p-8 hover:shadow-lg transition-all duration-300 group cursor-pointer border-2 hover:border-primary/20"
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
              >
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-2xl font-display font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
