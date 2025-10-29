"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCcw, RefreshCw } from "lucide-react";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  onCreate: () => void;
  isLoading: boolean;
}

export default function CreateFolderDialog({
  open,
  onOpenChange,
  newFolderName,
  setNewFolderName,
  onCreate,
  isLoading,
}: CreateFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Folder</DialogTitle>
          <DialogDescription>
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onCreate();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="glass"
          >
            Close{" "}
            {isLoading && <RefreshCw size={14} className="ml-4 animate-spin" />}
          </Button>
          <Button
            onClick={onCreate}
            disabled={!newFolderName.trim() || isLoading}
            className="gradient-primary text-white border-0 shadow-lg hover:shadow-glow"
          >
            {isLoading ? "Creating" : "Create Folder"}
            {isLoading && <RefreshCw size={14} className="ml-4 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
