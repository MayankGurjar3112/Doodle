"use client";

import React from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ZoomControlsProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  minZoom?: number;
  maxZoom?: number;
  onFitToScreen?: () => void;
}

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  zoom,
  setZoom,
  minZoom = 0.1,
  maxZoom = 5,
  onFitToScreen,
}) => {
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, maxZoom));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, minZoom));

  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-2 p-2 bg-card border border-border rounded-xl shadow-lg backdrop-blur-md z-40">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-8 w-8"
            >
              <Minus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="w-24 px-2">
        <Slider
          value={[zoom]}
          min={minZoom}
          max={maxZoom}
          step={0.1}
          onValueChange={(value) => setZoom(value[0])}
          className="cursor-pointer"
        />
      </div>

      <span className="text-xs font-medium w-12 text-center tabular-nums text-muted-foreground">
        {Math.round(zoom * 100)}%
      </span>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-8 w-8"
            >
              <Plus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {onFitToScreen && (
        <>
          <div className="w-px h-4 bg-border mx-1" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onFitToScreen}
                  className="h-8 w-8"
                >
                  <Maximize size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Screen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </>
      )}
    </div>
  );
};
