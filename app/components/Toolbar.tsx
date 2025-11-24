"use client";

import React, { useRef, useState, useEffect } from "react";
import { Tool } from "../../types";
import {
  MousePointer2,
  Square,
  Circle,
  ArrowUpRight,
  Pen,
  Type,
  Eraser,
  GripVertical,
  Hand,
  Minus,
  SquareDashed,
  CircleDashed,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

interface ToolbarProps {
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  position: { x: number; y: number };
  setPosition: (position: { x: number; y: number }) => void;
  currentColor: string;
  setCurrentColor: (color: string) => void;
  currentStrokeWidth: number;
  setCurrentStrokeWidth: (width: number) => void;
  onStrokeWidthChangeEnd?: (width: number) => void;
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

const ToolButton: React.FC<{
  title: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  shortcut?: string;
}> = ({ title, isActive, onClick, children, shortcut }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? "default" : "ghost"}
            size="icon"
            onClick={onClick}
            className={`rounded-xl transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          <p>
            {title}{" "}
            {shortcut && (
              <span className="text-muted-foreground ml-1">({shortcut})</span>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  setCurrentTool,
  position,
  setPosition,
  currentColor,
  setCurrentColor,
  currentStrokeWidth,
  setCurrentStrokeWidth,
  onStrokeWidthChangeEnd,
}) => {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !toolbarRef.current) return;

      const rect = toolbarRef.current.getBoundingClientRect();
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      const parent = toolbarRef.current.offsetParent as HTMLElement;
      const parentWidth = parent ? parent.clientWidth : window.innerWidth;
      const parentHeight = parent ? parent.clientHeight : window.innerHeight;

      // Constrain to parent bounds
      const maxX = parentWidth - rect.width;
      const maxY = parentHeight - rect.height;
      // topBarHeight was unused, removed it.

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, setPosition]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setIsDragging(true);
    }
  };

  const shapes = [
    {
      tool: "rectangle",
      icon: <Square size={20} />,
      label: "Rectangle",
      shortcut: "B",
    },
    {
      tool: "ellipse",
      icon: <Circle size={20} />,
      label: "Ellipse",
      shortcut: "C",
    },
    {
      tool: "rectangle-rounded",
      icon: <Square size={20} className="rounded-md" />,
      label: "Rounded Rectangle",
    },
    {
      tool: "rectangle-dashed",
      icon: <SquareDashed size={20} />,
      label: "Dashed Rectangle",
    },
    {
      tool: "ellipse-dashed",
      icon: <CircleDashed size={20} />,
      label: "Dashed Ellipse",
    },
    {
      tool: "rectangle-rounded-dashed",
      icon: <SquareDashed size={20} className="rounded-md" />,
      label: "Dashed Rounded Rectangle",
    },
  ];

  const lines = [
    {
      tool: "line",
      icon: <Minus size={20} className="-rotate-45" />,
      label: "Line",
      shortcut: "L",
    },
    {
      tool: "arrow",
      icon: <ArrowUpRight size={20} />,
      label: "Arrow",
      shortcut: "A",
    },
  ];

  const activeShape = shapes.find((s) => s.tool === currentTool) || shapes[0];
  const activeLine = lines.find((l) => l.tool === currentTool) || lines[0];

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: position.x,
        top: position.y,
      }}
      className="flex flex-col gap-1 p-2 bg-card border border-border rounded-2xl shadow-xl backdrop-blur-xl z-40 w-14 items-center"
    >
      {/* Drag Handle */}
      <div
        className="w-full h-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground"
        onMouseDown={handleMouseDown}
      >
        <GripVertical size={14} />
      </div>

      <Separator className="w-8 my-1" />

      {/* Color Picker */}
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <div
                    className="w-5 h-5 rounded-full border border-border"
                    style={{ backgroundColor: currentColor }}
                  />
                  <span className="sr-only">Pick color</span>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Stroke Color
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-auto p-3" side="right" sideOffset={10}>
          <div className="grid grid-cols-4 gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring ${
                  currentColor === color
                    ? "border-primary ring-2 ring-ring"
                    : "border-muted"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setCurrentColor(color)}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Stroke Width */}
      <Popover>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{
                      width: Math.min(20, Math.max(4, currentStrokeWidth)),
                      height: Math.min(20, Math.max(4, currentStrokeWidth)),
                    }}
                  />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              Stroke Width
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <PopoverContent className="w-64 p-4" side="right" sideOffset={10}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium leading-none">Stroke Width</h4>
              <span className="text-sm text-muted-foreground">
                {currentStrokeWidth}px
              </span>
            </div>
            <Slider
              value={[currentStrokeWidth]}
              onValueChange={(value) => setCurrentStrokeWidth(value[0])}
              onValueCommit={(value) => onStrokeWidthChangeEnd?.(value[0])}
              min={1}
              max={20}
              step={1}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Separator className="w-8 my-1" />

      <ToolButton
        title="Select"
        isActive={currentTool === "selection"}
        onClick={() => setCurrentTool("selection")}
        shortcut="S"
      >
        <MousePointer2 size={20} />
      </ToolButton>

      {/* Shapes Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={
              shapes.some((s) => s.tool === currentTool) ? "default" : "ghost"
            }
            size="icon"
            className={`rounded-xl transition-all duration-200 ${
              shapes.some((s) => s.tool === currentTool)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {activeShape.icon}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          {shapes.map((shape) => (
            <DropdownMenuItem
              key={shape.tool}
              onClick={() => setCurrentTool(shape.tool as Tool)}
              className="gap-2 justify-between"
            >
              <div className="flex items-center gap-2">
                {shape.icon}
                <span>{shape.label}</span>
              </div>
              {shape.shortcut && (
                <span className="text-xs text-muted-foreground ml-2">
                  {shape.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Lines Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={
              lines.some((l) => l.tool === currentTool) ? "default" : "ghost"
            }
            size="icon"
            className={`rounded-xl transition-all duration-200 ${
              lines.some((l) => l.tool === currentTool)
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {activeLine.icon}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          {lines.map((line) => (
            <DropdownMenuItem
              key={line.tool}
              onClick={() => setCurrentTool(line.tool as Tool)}
              className="gap-2 justify-between"
            >
              <div className="flex items-center gap-2">
                {line.icon}
                <span>{line.label}</span>
              </div>
              {line.shortcut && (
                <span className="text-xs text-muted-foreground ml-2">
                  {line.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolButton
        title="Draw"
        isActive={currentTool === "pen"}
        onClick={() => setCurrentTool("pen")}
        shortcut="P"
      >
        <Pen size={20} />
      </ToolButton>

      <ToolButton
        title="Pan"
        isActive={currentTool === "pan"}
        onClick={() => setCurrentTool("pan")}
        shortcut="Space"
      >
        <Hand size={20} />
      </ToolButton>

      <ToolButton
        title="Text"
        isActive={currentTool === "text"}
        onClick={() => setCurrentTool("text")}
        shortcut="T"
      >
        <Type size={20} />
      </ToolButton>

      <ToolButton
        title="Eraser"
        isActive={currentTool === "eraser"}
        onClick={() => setCurrentTool("eraser")}
        shortcut="E"
      >
        <Eraser size={20} />
      </ToolButton>

      <ToolButton
        title="AI Diagram"
        isActive={currentTool === "ai-diagram"}
        onClick={() => setCurrentTool("ai-diagram")}
      >
        <Sparkles size={20} />
      </ToolButton>
    </div>
  );
};
