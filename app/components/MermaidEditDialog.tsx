"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import mermaid from "mermaid";

interface MermaidEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialCode: string;
  onSave: (code: string) => void;
}

export const MermaidEditDialog: React.FC<MermaidEditDialogProps> = ({
  isOpen,
  onClose,
  initialCode,
  onSave,
}) => {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCode(initialCode);
    setError(null);
  }, [initialCode, isOpen]);

  const handleSave = async () => {
    try {
      setError(null);
      await mermaid.parse(code);
      onSave(code);
      onClose();
    } catch (e) {
      console.error("Mermaid parse error:", e);
      setError("Invalid Mermaid syntax. Please check your code.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Diagram</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            className={`h-[300px] font-mono ${
              error ? "border-red-500 focus-visible:ring-red-500" : ""
            }`}
            placeholder="Enter Mermaid code here..."
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
