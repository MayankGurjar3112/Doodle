import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Link as LinkIcon, Mail, Users } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: "svg" | "png" | "pdf") => void;
  roomId: string;
  isOwner: boolean;
  allowedEmails: string[];
  isPublic: boolean;
  onUpdatePermissions: (isPublic: boolean, allowedEmails: string[]) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onExport,
  roomId,
  isOwner,
  allowedEmails,
  isPublic,
  onUpdatePermissions,
}) => {
  const [emailInput, setEmailInput] = useState("");
  const [localAllowedEmails, setLocalAllowedEmails] =
    useState<string[]>(allowedEmails);
  const [localIsPublic, setLocalIsPublic] = useState(isPublic);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/documents/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEmail = () => {
    if (emailInput && !localAllowedEmails.includes(emailInput)) {
      const newEmails = [...localAllowedEmails, emailInput];
      setLocalAllowedEmails(newEmails);
      setEmailInput("");
      onUpdatePermissions(localIsPublic, newEmails);
    }
  };

  const handleRemoveEmail = (email: string) => {
    const newEmails = localAllowedEmails.filter((e) => e !== email);
    setLocalAllowedEmails(newEmails);
    onUpdatePermissions(localIsPublic, newEmails);
  };

  const handlePublicToggle = (checked: boolean) => {
    setLocalIsPublic(checked);
    onUpdatePermissions(checked, localAllowedEmails);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share & Export</DialogTitle>
          <DialogDescription>
            Collaborate with others or export your work.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <Input
                  id="link"
                  defaultValue={`${
                    typeof window !== "undefined" ? window.location.origin : ""
                  }/documents/${roomId}`}
                  readOnly
                />
              </div>
              <Button size="sm" className="px-3" onClick={handleCopyLink}>
                <span className="sr-only">Copy</span>
                {copied ? "Copied!" : <LinkIcon className="h-4 w-4" />}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="public-access"
                  checked={localIsPublic}
                  onCheckedChange={(checked) =>
                    handlePublicToggle(checked as boolean)
                  }
                  disabled={!isOwner}
                />
                <Label htmlFor="public-access">
                  Anyone with the link can edit
                </Label>
              </div>

              {!localIsPublic && (
                <div className="space-y-3 border rounded-md p-3">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> Restricted Access
                  </div>
                  {isOwner ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add email address"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
                      />
                      <Button size="sm" onClick={handleAddEmail}>
                        Add
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Only the owner can manage access.
                    </p>
                  )}

                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {localAllowedEmails.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No emails added yet.
                      </p>
                    ) : (
                      localAllowedEmails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between text-sm bg-muted p-2 rounded"
                        >
                          <span>{email}</span>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveEmail(email)}
                            >
                              &times;
                            </Button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => onExport("svg")}
              >
                <Download className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>Export as SVG</span>
                  <span className="text-xs text-muted-foreground">
                    Best for vector editing
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => onExport("png")}
              >
                <Download className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>Export as PNG</span>
                  <span className="text-xs text-muted-foreground">
                    Best for sharing images
                  </span>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-12"
                onClick={() => onExport("pdf")}
              >
                <Download className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span>Export as PDF</span>
                  <span className="text-xs text-muted-foreground">
                    Best for printing
                  </span>
                </div>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
