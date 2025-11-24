import React from "react";
import {
  WhiteboardElement,
  Tool,
  LineElement,
  ShapeElement,
  TextElement,
} from "../../types";
import {
  getElementBounds,
  getSmoothPath,
  getArrowHead,
  measureText,
} from "../utils";
import { MermaidRenderer } from "./MermaidRenderer";

type EditingState = { id: string };

interface WhiteboardElementProps {
  element: WhiteboardElement;
  currentTool: Tool;
  editingState: EditingState | null;
  liveEditText: string | null;
  isSelected: boolean;
  measuredLastLineWidth: number;
  onMouseDown: (e: React.MouseEvent) => void;
  isPreview: boolean;
  theme?: string;
  onTextChange?: (text: string) => void;
  onMermaidSizeChange?: (id: string, width: number, height: number) => void;
}

const LockIcon = () => (
  <path d="M12 15a2 2 0 01-2-2V9a2 2 0 014 0v4a2 2 0 01-2 2zM18 8h-1V6a5 5 0 00-10 0v2H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2z" />
);

export const WhiteboardElementComponent = React.memo(
  ({
    element,
    currentTool,
    editingState,
    liveEditText,
    isSelected,
    measuredLastLineWidth,
    onMouseDown,
    isPreview,
    theme,
    onTextChange,
    onMermaidSizeChange,
  }: WhiteboardElementProps) => {
    const isLocked = element.locked;
    const isEditingThis = editingState?.id === element.id;

    const getEffectiveColor = (color: string) => {
      if (color === "default") {
        return theme === "dark" ? "#e2e8f0" : "#18181b";
      }
      return color;
    };

    const getElementCursor = () => {
      if (isPreview) return "default";
      if (currentTool === "pan") return "grab";
      if (currentTool === "eraser") return "inherit";
      if (currentTool === "selection") return "move";
      if (currentTool === "text") return "text";
      return "crosshair";
    };

    const bounds = getElementBounds(element);
    const centerX = bounds.x1 + (bounds.x2 - bounds.x1) / 2;
    const centerY = bounds.y1 + (bounds.y2 - bounds.y1) / 2;

    return (
      <g
        key={element.id}
        data-id={element.id}
        opacity={isPreview ? 0.4 : isLocked ? 0.6 : 1}
        style={{
          cursor: getElementCursor(),
          pointerEvents: isPreview ? "none" : undefined,
        }}
        transform={`rotate(${element.angle || 0} ${centerX} ${centerY})`}
      >
        {(() => {
          switch (element.type) {
            case "pen":
              return (
                <path
                  d={getSmoothPath(element.points)}
                  stroke={getEffectiveColor(element.color)}
                  strokeWidth={element.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none"
                />
              );
            case "shape":
            case "line":
              const { x1, y1, x2, y2 } = element;
              const minX = Math.min(x1, x2),
                minY = Math.min(y1, y2),
                width = Math.abs(x1 - x2),
                height = Math.abs(y1 - y2);

              const displayText =
                isEditingThis && liveEditText !== null
                  ? liveEditText
                  : element.text;

              let textElement;
              const textProps = {
                fill: getEffectiveColor(element.color),
                className: "pointer-events-none select-none",
                dominantBaseline: "middle" as const,
                textAnchor: "middle" as const,
                fontSize: "16px",
                fontFamily: "inherit",
              };
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              if (displayText || isEditingThis) {
                const textLines = (displayText || "").split("\n");
                const LINE_HEIGHT = 1.2;
                const FONT_SIZE = 16;
                const totalTextHeight =
                  textLines.length * FONT_SIZE * LINE_HEIGHT;
                const startY =
                  midY - totalTextHeight / 2 + (FONT_SIZE * LINE_HEIGHT) / 2;

                textElement = (
                  <text x={midX} y={startY} {...textProps}>
                    {textLines.map((line, index) => (
                      <tspan
                        key={index}
                        x={midX}
                        dy={`${index > 0 ? LINE_HEIGHT : 0}em`}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                );
              }

              let cursorElement;
              if (isEditingThis) {
                const textLines = (displayText || "").split("\n");
                const lastLineWidth = measuredLastLineWidth;

                const LINE_HEIGHT = 1.2;
                const FONT_SIZE = 16;
                const totalTextHeight =
                  textLines.length * FONT_SIZE * LINE_HEIGHT;
                const startY =
                  midY - totalTextHeight / 2 + (FONT_SIZE * LINE_HEIGHT) / 2;
                const cursorY =
                  startY + (textLines.length - 1) * FONT_SIZE * LINE_HEIGHT;

                const cursorX = midX - lastLineWidth / 2 + lastLineWidth;

                cursorElement = (
                  <line
                    x1={cursorX}
                    y1={cursorY - FONT_SIZE / 2}
                    x2={cursorX}
                    y2={cursorY + FONT_SIZE / 2}
                    stroke={getEffectiveColor(element.color)}
                    strokeWidth="100"
                    className="animate-pulse"
                  />
                );
              }

              if (element.type === "shape") {
                const shapeProps = {
                  stroke: getEffectiveColor(element.color),
                  strokeWidth: element.strokeWidth,
                  fill: "transparent",
                  pointerEvents: "visiblePainted" as const,
                  strokeDasharray:
                    element.strokeStyle === "dashed" ? "8 4" : undefined,
                };
                let shape;
                switch (element.tool) {
                  case "rectangle":
                    shape = (
                      <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        {...shapeProps}
                      />
                    );
                    break;
                  case "rectangle-rounded":
                  case "rectangle-rounded-dashed":
                    shape = (
                      <rect
                        x={minX}
                        y={minY}
                        width={width}
                        height={height}
                        rx="10"
                        {...shapeProps}
                      />
                    );
                    break;
                  case "ellipse":
                    shape = (
                      <ellipse
                        cx={minX + width / 2}
                        cy={minY + height / 2}
                        rx={width / 2}
                        ry={height / 2}
                        {...shapeProps}
                      />
                    );
                    break;
                }
                return (
                  <g>
                    {shape}
                    {textElement}
                    {cursorElement}
                  </g>
                );
              } else {
                // Line
                const pathPoints = element.points || [
                  { x: x1, y: y1 },
                  { x: x2, y: y2 },
                ];
                const lineProps = {
                  stroke: getEffectiveColor(element.color),
                  strokeWidth: element.strokeWidth,
                  fill: "none",
                  strokeLinecap: "round" as const,
                  strokeLinejoin: "round" as const,
                };

                return (
                  <g>
                    {pathPoints.map((p, i) => {
                      if (i === 0) return null;
                      const p1 = pathPoints[i - 1];
                      return (
                        <line
                          key={i}
                          x1={p1.x}
                          y1={p1.y}
                          x2={p.x}
                          y2={p.y}
                          {...lineProps}
                        />
                      );
                    })}
                    {element.tool === "arrow" && (
                      <path
                        d={getArrowHead(
                          pathPoints[pathPoints.length - 2],
                          pathPoints[pathPoints.length - 1]
                        )}
                        fill={getEffectiveColor(element.color)}
                      />
                    )}
                    {textElement}
                    {cursorElement}

                    {/* Render handles for lines if selected or editing */}
                    {(isSelected || isEditingThis) && (
                      <>
                        {/* Start Handle */}
                        <circle
                          cx={pathPoints[0].x}
                          cy={pathPoints[0].y}
                          r={4}
                          fill={
                            element.startBinding
                              ? getEffectiveColor(element.color)
                              : "white"
                          }
                          stroke={getEffectiveColor(element.color)}
                          strokeWidth={2}
                        />
                        {/* End Handle */}
                        <circle
                          cx={pathPoints[pathPoints.length - 1].x}
                          cy={pathPoints[pathPoints.length - 1].y}
                          r={4}
                          fill={
                            element.endBinding
                              ? getEffectiveColor(element.color)
                              : "white"
                          }
                          stroke={getEffectiveColor(element.color)}
                          strokeWidth={2}
                        />
                      </>
                    )}
                  </g>
                );
              }
              return null;
            case "text":
              const isEditing = isEditingThis;
              const textContent =
                isEditing && liveEditText !== null
                  ? liveEditText
                  : element.text;

              if (isEditing) {
                const { width: measuredWidth, height: measuredHeight } =
                  measureText(
                    textContent,
                    element.fontSize,
                    element.fontFamily
                  );
                const padding = 20;
                const boxWidth = measuredWidth + padding;
                const boxHeight = measuredHeight + padding;

                let xOffset = -10;
                if (element.align === "center") {
                  xOffset = -boxWidth / 2;
                } else if (element.align === "right") {
                  xOffset = -boxWidth + 10;
                }

                return (
                  <foreignObject
                    x={element.x + xOffset}
                    y={element.y - 10}
                    width={boxWidth}
                    height={boxHeight}
                    style={{ overflow: "visible" }}
                  >
                    <textarea
                      autoFocus
                      className="w-full h-full bg-transparent outline-none resize-none overflow-hidden p-2 m-0 border-2 border-blue-500 rounded-lg"
                      style={{
                        fontSize: `${element.fontSize}px`,
                        fontFamily: element.fontFamily,
                        color: getEffectiveColor(element.color),
                        textAlign: element.align,
                        lineHeight: 1.2,
                        whiteSpace: "pre",
                      }}
                      value={textContent}
                      onChange={(e) => onTextChange?.(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  </foreignObject>
                );
              }

              return (
                <text
                  x={element.x}
                  y={element.y}
                  fill={getEffectiveColor(element.color)}
                  fontSize={element.fontSize}
                  fontFamily={element.fontFamily}
                  textAnchor={
                    element.align === "center"
                      ? "middle"
                      : element.align === "right"
                      ? "end"
                      : "start"
                  }
                  dominantBaseline="hanging"
                  style={{
                    userSelect: "none",
                    pointerEvents: "none",
                    whiteSpace: "pre",
                  }}
                >
                  {element.text.split("\n").map((line, i) => (
                    <tspan
                      key={i}
                      x={element.x}
                      dy={i === 0 ? 0 : `${element.fontSize * 1.2}px`}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            case "mermaid":
              return (
                <foreignObject
                  x={element.x}
                  y={element.y}
                  width={element.width}
                  height={element.height}
                  style={{ overflow: "visible", pointerEvents: "none" }}
                >
                  <MermaidRenderer
                    code={element.code}
                    id={element.id}
                    width={element.width}
                    height={element.height}
                    onSizeChange={(w, h) =>
                      onMermaidSizeChange?.(element.id, w, h)
                    }
                  />
                </foreignObject>
              );
            default:
              return null;
          }
        })()}
        {isLocked && isSelected && (
          <foreignObject
            x={bounds.x1}
            y={bounds.y1 - 24}
            width="20"
            height="20"
            className="pointer-events-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-slate-500 dark:text-slate-400 bg-card rounded-sm p-0.5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <LockIcon />
            </svg>
          </foreignObject>
        )}
      </g>
    );
  }
);

WhiteboardElementComponent.displayName = "WhiteboardElementComponent";
