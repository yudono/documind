"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface Version {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isDraft: boolean;
}

export default function HistoryDialog({
  open,
  onOpenChange,
  versions,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: Version[];
  onRestore: (content: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of your document.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-4">
            {versions.map((version) => (
              <Card key={version.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{version.title}</CardTitle>
                    <Badge variant={version.isDraft ? "secondary" : "default"}>
                      {version.isDraft ? "Draft" : "Published"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {version.createdAt.toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div
                    className="text-sm text-muted-foreground line-clamp-3"
                    dangerouslySetInnerHTML={{
                      __html: version.content.substring(0, 200) + "...",
                    }}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onRestore(version.content)}
                    >
                      Restore
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {versions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No version history available yet.
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}