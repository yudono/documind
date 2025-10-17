'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Check, X, Reply, Trash2, Plus } from 'lucide-react';

export interface Comment {
  id: string;
  text: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  resolved: boolean;
  selectedText: string;
  range: {
    from: number;
    to: number;
  };
  replies: Comment[];
}

interface CommentSidebarProps {
  comments: Comment[];
  onAddComment: (text: string, selectedText: string, range: { from: number; to: number }) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onReplyToComment: (commentId: string, text: string) => void;
  currentUser: {
    id: string;
    name: string;
    email: string;
  };
  selectedText: string;
  selectedRange?: { from: number; to: number };
}

export function CommentSidebar({
  comments,
  onAddComment,
  onResolveComment,
  onDeleteComment,
  onReplyToComment,
  currentUser,
  selectedText,
  selectedRange,
}: CommentSidebarProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  const [showReplyInput, setShowReplyInput] = useState<{ [key: string]: boolean }>({});

  const handleAddComment = () => {
    if (newComment.trim() && selectedText && selectedRange) {
      onAddComment(newComment.trim(), selectedText, selectedRange);
      setNewComment('');
    }
  };

  const handleReply = (commentId: string) => {
    const replyText = replyTexts[commentId];
    if (replyText?.trim()) {
      onReplyToComment(commentId, replyText.trim());
      setReplyTexts({ ...replyTexts, [commentId]: '' });
      setShowReplyInput({ ...showReplyInput, [commentId]: false });
    }
  };

  const toggleReplyInput = (commentId: string) => {
    setShowReplyInput({
      ...showReplyInput,
      [commentId]: !showReplyInput[commentId],
    });
  };

  const updateReplyText = (commentId: string, text: string) => {
    setReplyTexts({ ...replyTexts, [commentId]: text });
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const unresolvedComments = comments.filter(comment => !comment.resolved);

  return (
    <div className="w-80 bg-background border-l h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Comments</h3>
          {unresolvedComments.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {unresolvedComments.length}
            </Badge>
          )}
        </div>
      </div>

      {/* Add Comment Section */}
      {selectedText && selectedRange && (
        <div className="p-4 border-b bg-muted/50">
          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">Selected text:</span>
              <div className="mt-1 p-2 bg-background rounded border text-sm italic">
                "{selectedText}"
              </div>
            </div>
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex space-x-2">
              <Button onClick={handleAddComment} size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" />
                Add Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet</p>
            <p className="text-sm">Select text to add a comment</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className={`${comment.resolved ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{comment.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(comment.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {comment.resolved && (
                      <Badge variant="secondary" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Selected Text Context */}
                <div className="mb-3 p-2 bg-muted rounded text-sm">
                  <span className="font-medium">Context:</span>
                  <div className="mt-1 italic">"{comment.selectedText}"</div>
                </div>

                {/* Comment Text */}
                <p className="text-sm mb-3">{comment.text}</p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {!comment.resolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onResolveComment(comment.id)}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Resolve
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleReplyInput(comment.id)}
                    className="text-xs"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  {comment.author.id === currentUser.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteComment(comment.id)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Reply Input */}
                {showReplyInput[comment.id] && (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyTexts[comment.id] || ''}
                      onChange={(e) => updateReplyText(comment.id, e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(comment.id)}
                        className="text-xs"
                      >
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleReplyInput(comment.id)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="comment-reply">
                        <div className="flex items-start space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {getInitials(reply.author.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-medium">{reply.author.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimestamp(reply.timestamp)}
                              </p>
                            </div>
                            <p className="text-xs mt-1">{reply.text}</p>
                          </div>
                          {reply.author.id === currentUser.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteComment(reply.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}