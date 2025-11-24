"use client";

import React from "react";
import { ViewMode, Collaborator } from "../../types";
import {
  LayoutGrid,
  FileText,
  Columns,
  Share2,
  MessageSquare,
  Download,
  Sun,
  Moon,
  Undo,
  Redo,
  Menu,
  Phone,
  Video,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TopBarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onShare: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (isOpen: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  title?: string;
  saveStatus?: "saved" | "saving" | "error";
  collaborators?: Collaborator[];
  ownerId?: string | null;
  isCallOpen?: boolean;
  onToggleCall?: () => void;
  activeCallParticipants?: string[];
}

const COLORS = [
  "#000000", // Black
  "#e03131", // Red
  "#2f9e44", // Green
  "#1971c2", // Blue
  "#f08c00", // Orange
  "#9c36b5", // Purple
  "#f6339a", // Pink
  "#ffdf20", // Yellow
];

export const TopBar: React.FC<TopBarProps> = ({
  viewMode,
  setViewMode,
  onShare,
  isChatOpen,
  setIsChatOpen,
  onUndo,
  collaborators = [],
  ownerId,
  isCallOpen = false,
  onToggleCall,
  activeCallParticipants = [],
  title,
  saveStatus,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const { theme, setTheme } = useTheme();
  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 font-bold text-xl text-foreground">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
            <span className="text-lg">D</span>
          </div>
          <span className="hidden sm:inline">{title}</span>
          <div className="text-xs text-muted-foreground ml-2 min-w-[60px]">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "Saved"}
            {saveStatus === "error" && (
              <span className="text-red-500">Error</span>
            )}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Separator orientation="vertical" className="h-6 bg-white/20" />

          {/* View Mode Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border rounded-lg p-1 bg-muted/50"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="canvas"
                    aria-label="Canvas"
                    size="sm"
                    className={
                      viewMode === "canvas"
                        ? "bg-background text-foreground shadow-sm"
                        : ""
                    }
                  >
                    <LayoutGrid size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Canvas View</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="document"
                    aria-label="Document"
                    size="sm"
                    className={
                      viewMode === "document"
                        ? "bg-background text-foreground shadow-sm"
                        : ""
                    }
                  >
                    <FileText size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Document View</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="both"
                    aria-label="Split View"
                    size="sm"
                    className={
                      viewMode === "both"
                        ? "bg-background text-foreground shadow-sm"
                        : ""
                    }
                  >
                    <Columns size={18} />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>Split View</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </ToggleGroup>

          <Separator orientation="vertical" className="h-6 bg-white/20" />

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onUndo}
                    disabled={!canUndo}
                  >
                    <Undo size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRedo}
                    disabled={!canRedo}
                  >
                    <Redo size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Desktop Right Actions */}
      <div className="hidden md:flex items-center gap-2">
        {/* Collaborators */}
        <div className="flex -space-x-2 mr-4">
          {collaborators.slice(0, 3).map((c) => (
            <TooltipProvider key={c.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="w-8 h-8 border-2 border-background cursor-default">
                    <AvatarImage
                      src={c.photoURL}
                      alt={c.name || "Collaborator"}
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                    <AvatarFallback
                      className="text-xs text-white font-medium"
                      style={{ backgroundColor: c.color }}
                    >
                      {(c.name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  {c.name || "Collaborator"} {ownerId === c.id && "(Owner)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {collaborators.length > 3 && (
            <div className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground cursor-default">
              +{collaborators.length - 3}
            </div>
          )}
        </div>

        {/* Theme Picker */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Chat Toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isChatOpen ? "secondary" : "outline"}
                size="icon"
                onClick={() => setIsChatOpen(!isChatOpen)}
              >
                <MessageSquare size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Call Button */}
        <div className="hidden md:flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isCallOpen ? "destructive" : "outline"}
                  size="sm"
                  className={`gap-2 ${
                    activeCallParticipants.length > 0 && !isCallOpen
                      ? "animate-pulse border-green-500 text-green-500"
                      : ""
                  }`}
                  onClick={onToggleCall}
                >
                  {isCallOpen ? (
                    <Phone size={16} className="rotate-135" />
                  ) : (
                    <Video size={16} />
                  )}
                  {isCallOpen ? "Leave" : "Call"}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {activeCallParticipants.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="font-bold">In Call:</span>
                    {activeCallParticipants.map((name, i) => (
                      <span key={i}>{name}</span>
                    ))}
                  </div>
                ) : (
                  "Start Video Call"
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Share Menu */}
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            onClick={onShare}
          >
            Share <Share2 size={16} />
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="flex md:hidden items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
        >
          <Undo size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <Redo size={18} />
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu size={24} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[340px]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <SheetDescription className="px-4">
              <div className="flex flex-col gap-6 mt-6">
                {/* View Mode */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">View Mode</h4>
                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => v && setViewMode(v as ViewMode)}
                    className="justify-start w-fit"
                  >
                    <ToggleGroupItem
                      value="canvas"
                      aria-label="Canvas"
                      className={
                        viewMode === "canvas"
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                    >
                      <LayoutGrid size={18} className="mr-2" /> Canvas
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="document"
                      aria-label="Document"
                      className={
                        viewMode === "document"
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }
                    >
                      <FileText size={18} className="mr-2" /> Document
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Separator />

                {/* Actions */}
                <div className="grid gap-2">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    Toggle Theme
                  </Button>
                  <Button
                    variant={isChatOpen ? "secondary" : "outline"}
                    className="justify-start"
                    onClick={() => setIsChatOpen(!isChatOpen)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </Button>
                </div>

                <Separator />

                {/* Share */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="justify-start w-full"
                    onClick={onShare}
                  >
                    <Share2 className="mr-2 h-4 w-4" /> Share & Export
                  </Button>
                </div>
              </div>
            </SheetDescription>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
