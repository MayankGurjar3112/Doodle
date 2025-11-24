"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateDocumentButton } from "./dashboard/CreateDocumentButton";
import { DocumentRow } from "./dashboard/DocumentRow";
import {
  HelpCircle,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/components/auth-provider";
import { ThemeToggle } from "./theme-toggle";

interface Document {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  authorId: string;
}

export function DashboardView() {
  const { user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!user) return;
      try {
        const res = await fetch(`/api/documents?authorId=${user.uid}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setDocuments(data);
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");

  const handleCreate = () => {
    setNewDocName("Untitled Document");
    setIsCreateDialogOpen(true);
  };

  const confirmCreate = async () => {
    if (!newDocName.trim()) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDocName, authorId: user?.uid }),
      });
      if (res.ok) {
        const doc = await res.json();
        router.push(`/documents/${doc._id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create document");
      }
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreateDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d._id !== id));
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocuments((prev) => [newDoc, ...prev]);
      }
    } catch (error) {
      console.error("Failed to duplicate document:", error);
    }
  };

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => (d._id === id ? { ...d, name: newName } : d))
        );
      }
    } catch (error) {
      console.error("Failed to rename document:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-indigo-500/30 relative overflow-hidden transition-colors duration-300">
      {/* Animated Background for Dashboard too, but subtler */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-900/10 dark:bg-purple-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 dark:bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <span className="text-lg">D</span>
            </div>
            Documents
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full hover:bg-accent"
                >
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage
                      src={user?.photoURL || ""}
                      alt={user?.displayName || "User"}
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user?.displayName?.charAt(0) ||
                        user?.email?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-red-500 focus:text-red-500 focus:bg-red-100 dark:focus:bg-red-900/20 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="p-8 relative z-10">
        {/* Header Section */}
        <div className="mb-12 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <CreateDocumentButton
              onClick={handleCreate}
              disabled={documents.length >= 3}
            />
            {documents.length >= 3 && (
              <span className="text-red-500 text-sm ml-4">
                Document limit reached (3/3).
              </span>
            )}
          </div>
        </div>

        {/* Table Header */}
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-xl border border-border overflow-hidden bg-card/50 backdrop-blur-sm">
            <div className="flex items-center justify-between px-6 py-4 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/50">
              <div className="flex-1">Name</div>
              <div className="hidden md:flex items-center gap-8 flex-1 justify-end mr-8">
                <span className="w-37">Created</span>
                <span className="w-32 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors">
                  Edited
                </span>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-border">
              {isLoading ? (
                // Skeletons
                [1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 animate-pulse" />
                ))
              ) : documents.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  No documents found. Create one to get started.
                </div>
              ) : (
                documents.map((doc) => (
                  <DocumentRow
                    key={doc._id}
                    doc={doc}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onRename={handleRename}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              placeholder="Document Name"
              className="focus-visible:ring-primary"
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmCreate();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button onClick={confirmCreate} className="cursor-pointer">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
