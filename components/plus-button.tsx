"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Type, Image, Link, Table, Bot, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3, Sparkles, FileText, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PlusButtonProps {
  editor: any;
  position: { top: number; left: number };
  visible: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

export default function PlusButton({ editor, position, visible, onClose }: PlusButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        onClose();
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, onClose]);

  const menuItems: MenuItem[] = [
    {
      id: 'text',
      title: 'Text',
      description: 'Just start writing with plain text',
      icon: <Type className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().insertContent('<p></p>').run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'heading1',
      title: 'Heading 1',
      description: 'Big section heading',
      icon: <Heading1 className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleHeading({ level: 1 }).run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'heading2',
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: <Heading2 className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleHeading({ level: 2 }).run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'heading3',
      title: 'Heading 3',
      description: 'Small section heading',
      icon: <Heading3 className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleHeading({ level: 3 }).run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'bulletList',
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: <List className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleBulletList().run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'numberedList',
      title: 'Numbered List',
      description: 'Create a list with numbering',
      icon: <ListOrdered className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleOrderedList().run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Capture a quote',
      icon: <Quote className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleBlockquote().run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'code',
      title: 'Code',
      description: 'Capture a code snippet',
      icon: <Code className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().toggleCodeBlock().run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'image',
      title: 'Image',
      description: 'Upload or embed with a link',
      icon: <Image className="h-4 w-4" />,
      action: () => {
        const url = window.prompt('Enter image URL:');
        if (url) {
          editor?.chain().focus().setImage({ src: url }).run();
        }
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'link',
      title: 'Link',
      description: 'Add a link to your text',
      icon: <Link className="h-4 w-4" />,
      action: () => {
        const url = window.prompt('Enter URL:');
        if (url) {
          editor?.chain().focus().setLink({ href: url }).run();
        }
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Add a table',
      icon: <Table className="h-4 w-4" />,
      action: () => {
        editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
        setShowMenu(false);
        onClose();
      }
    },
    // AI Functionality Section
    {
      id: 'ai-continue',
      title: 'AI Continue Writing',
      description: 'Let AI continue your thoughts',
      icon: <Bot className="h-4 w-4 text-purple-600" />,
      action: () => {
        editor?.chain().focus().insertContent('<p class="ai-placeholder" data-type="continue">✨ AI will continue writing from here...</p>').run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'ai-improve',
      title: 'AI Improve Text',
      description: 'Enhance and refine your writing',
      icon: <Sparkles className="h-4 w-4 text-blue-600" />,
      action: () => {
        editor?.chain().focus().insertContent('<p class="ai-placeholder" data-type="improve">✨ Select text above to improve with AI...</p>').run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'ai-summarize',
      title: 'AI Summarize',
      description: 'Create a summary of your content',
      icon: <FileText className="h-4 w-4 text-green-600" />,
      action: () => {
        editor?.chain().focus().insertContent('<p class="ai-placeholder" data-type="summarize">📝 AI will generate a summary here...</p>').run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'ai-brainstorm',
      title: 'AI Brainstorm',
      description: 'Generate ideas and suggestions',
      icon: <Lightbulb className="h-4 w-4 text-yellow-600" />,
      action: () => {
        editor?.chain().focus().insertContent('<p class="ai-placeholder" data-type="brainstorm">💡 AI will brainstorm ideas about your topic...</p>').run();
        setShowMenu(false);
        onClose();
      }
    },
    {
      id: 'ai-explain',
      title: 'AI Explain',
      description: 'Get detailed explanations',
      icon: <Bot className="h-4 w-4 text-indigo-600" />,
      action: () => {
        editor?.chain().focus().insertContent('<p class="ai-placeholder" data-type="explain">🤖 AI will explain the concept above...</p>').run();
        setShowMenu(false);
        onClose();
      }
    }
  ];

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{
        top: position.top,
        left: position.left - 40, // Offset to align with text
      }}
    >
      {!showMenu ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 rounded-full border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
          onClick={() => setShowMenu(true)}
        >
          <Plus className="h-3 w-3 text-gray-500" />
        </Button>
      ) : (
        <Card className="w-80 max-h-96 overflow-y-auto shadow-lg border">
          <CardContent className="p-2">
            <div className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-100 text-left transition-colors"
                  onClick={item.action}
                >
                  <div className="flex-shrink-0 text-gray-500">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}