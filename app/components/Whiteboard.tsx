import React, { forwardRef } from "react";
import {
  WhiteboardElement,
  Point,
  ShapeElement,
  Tool,
  LineElement,
  MermaidElement,
} from "../../types";
import { LiaEraserSolid } from "react-icons/lia";
import { getElementBounds } from "../utils";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { WhiteboardElementComponent } from "./WhiteboardElement";

type EditingState = { id: string };
type ConnectionPointInfo = { point: Point; direction: "N" | "S" | "E" | "W" };

interface WhiteboardProps {
  elements: WhiteboardElement[];
  drawingElement: WhiteboardElement | null;
  shapePreview: WhiteboardElement | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseLeave: (e: React.MouseEvent<SVGSVGElement>) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
  selectedElementIds: Set<string>;
  currentTool: Tool;
  selectionArea: { x1: number; y1: number; x2: number; y2: number } | null;
  editingState: EditingState | null;
  liveEditText: string | null;
  viewBox: { x: number; y: number; width: number; height: number };
  snapPointInfo: {
    point: Point;
    shapeId: string;
    direction: "N" | "S" | "E" | "W";
  } | null;
  getShapeConnectionPoints: (element: ShapeElement) => ConnectionPointInfo[];
  textMeasureRef: React.RefObject<SVGTextElement | null>;
  theme?: string;
  onTextChange: (text: string) => void;
  onEditMermaid?: (id: string, code: string) => void;
  onMermaidSizeChange?: (id: string, width: number, height: number) => void;
}

const SelectionControls: React.FC<{
  bounds: { x1: number; y1: number; x2: number; y2: number };
  angle: number;
  onMouseDown: (e: React.MouseEvent) => void;
  elementIds: string[];
}> = ({ bounds, angle, onMouseDown, elementIds }) => {
  const { x1, y1, x2, y2 } = bounds;
  const width = x2 - x1;
  const height = y2 - y1;
  const centerX = x1 + width / 2;
  const centerY = y1 + height / 2;
  const PADDING = 10;

  const handles = [
    { name: "top-left", x: x1, y: y1, cursor: "nwse-resize" },
    { name: "top-middle", x: centerX, y: y1, cursor: "ns-resize" },
    { name: "top-right", x: x2, y: y1, cursor: "nesw-resize" },
    { name: "middle-right", x: x2, y: centerY, cursor: "ew-resize" },
    { name: "bottom-right", x: x2, y: y2, cursor: "nwse-resize" },
    { name: "bottom-middle", x: centerX, y: y2, cursor: "ns-resize" },
    { name: "bottom-left", x: x1, y: y2, cursor: "nesw-resize" },
    { name: "middle-left", x: x1, y: centerY, cursor: "ew-resize" },
  ];

  const handleProps = (handleName: string) => ({
    "data-handle": handleName,
    "data-id": elementIds[0],
    onMouseDown,
  });

  return (
    <g transform={`rotate(${angle || 0} ${centerX} ${centerY})`}>
      <rect
        x={x1 - PADDING / 2}
        y={y1 - PADDING / 2}
        width={width + PADDING}
        height={height + PADDING}
        fill="none"
        stroke="rgba(0, 118, 255, 0.9)"
        strokeWidth="1"
        strokeDasharray="4 2"
        className="pointer-events-none"
      />

      {/* Rotation Handle */}
      <line
        x1={centerX}
        y1={y1 - PADDING / 2}
        x2={centerX}
        y2={y1 - PADDING - 10}
        stroke="rgba(0, 118, 255, 0.9)"
        strokeWidth="1"
      />
      <circle
        cx={centerX}
        cy={y1 - PADDING - 18}
        r="8"
        fill="white"
        stroke="rgba(0, 118, 255, 0.9)"
        strokeWidth="1"
        className="pointer-events-none"
      />
      {/* Hit area for rotation */}
      <circle
        cx={centerX}
        cy={y1 - PADDING - 18}
        r="20"
        fill="transparent"
        cursor="grab"
        {...handleProps("rotate")}
      />

      {/* Resize Handles */}
      {handles.map(({ name, x, y, cursor }) => (
        <g key={name}>
          {/* Visible Handle */}
          <rect
            x={x - 4}
            y={y - 4}
            width="8"
            height="8"
            fill="white"
            stroke="rgba(0, 118, 255, 0.9)"
            strokeWidth="1"
            className="pointer-events-none"
          />
          {/* Invisible Hit Area (24x24) */}
          <rect
            x={x - 12}
            y={y - 12}
            width="24"
            height="24"
            fill="transparent"
            cursor={cursor}
            {...handleProps(name)}
          />
        </g>
      ))}
    </g>
  );
};

const LineSelectionControls: React.FC<{
  element: LineElement;
  onMouseDown: (e: React.MouseEvent) => void;
}> = ({ element, onMouseDown }) => {
  const { points, x1, y1, x2, y2 } = element;
  if (!points) return null;

  const handleProps = (handleName: "line-start" | "line-end") => ({
    "data-handle": handleName,
    "data-id": element.id,
    onMouseDown,
  });

  return (
    <g>
      {points.map((p, i) => {
        if (i === 0) return null;
        const p1 = points[i - 1];
        return (
          <line
            key={i}
            x1={p1.x}
            y1={p1.y}
            x2={p.x}
            y2={p.y}
            stroke="rgba(0, 118, 255, 0.5)"
            strokeWidth={element.strokeWidth + 8}
            strokeLinecap="round"
            className="pointer-events-stroke hover:stroke-blue-500"
            data-handle="line-segment"
            data-id={element.id}
            data-segment-index={i - 1}
            onMouseDown={onMouseDown}
            cursor="move"
          />
        );
      })}
      <circle
        cx={x1}
        cy={y1}
        r="8"
        fill="white"
        stroke="rgba(0, 118, 255, 0.9)"
        strokeWidth="2"
        className="pointer-events-none"
      />
      <circle
        cx={x1}
        cy={y1}
        r="20"
        fill="transparent"
        cursor="grab"
        {...handleProps("line-start")}
      />
      <circle
        cx={x2}
        cy={y2}
        r="8"
        fill="white"
        stroke="rgba(0, 118, 255, 0.9)"
        strokeWidth="2"
        className="pointer-events-none"
      />
      <circle
        cx={x2}
        cy={y2}
        r="20"
        fill="transparent"
        cursor="grab"
        {...handleProps("line-end")}
      />
    </g>
  );
};

// eslint-disable-next-line react/display-name
export const Whiteboard = forwardRef<SVGSVGElement, WhiteboardProps>(
  (
    {
      elements,
      drawingElement,
      shapePreview,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onDoubleClick,
      onWheel,
      selectedElementIds,
      currentTool,
      selectionArea,
      editingState,
      liveEditText,
      viewBox,
      snapPointInfo,
      getShapeConnectionPoints,
      textMeasureRef,
      theme,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTextChange,
      onEditMermaid,
      onMermaidSizeChange,
    },
    ref
  ) => {
    const [measuredLastLineWidth, setMeasuredLastLineWidth] = React.useState(0);

    const measuringText =
      editingState && liveEditText !== null
        ? liveEditText.split("\n").pop() || ""
        : "";

    React.useLayoutEffect(() => {
      if (textMeasureRef.current) {
        setMeasuredLastLineWidth(
          textMeasureRef.current.getComputedTextLength()
        );
      }
    }, [measuringText, textMeasureRef]);

    const getEffectiveColor = (color: string) => {
      if (color === "default") {
        return theme === "dark" ? "#e2e8f0" : "#18181b";
      }
      return color;
    };
    const colors = Array.from(
      new Set(
        elements
          .filter(
            (el): el is LineElement => el.type === "line" && el.tool === "arrow"
          )
          .map((el) => el.color)
      )
    );

    const selectedGroups = new Map<string, WhiteboardElement[]>();
    const selectedSingles: WhiteboardElement[] = [];

    elements.forEach((el) => {
      if (selectedElementIds.has(el.id)) {
        if (el.groupId) {
          if (!selectedGroups.has(el.groupId))
            selectedGroups.set(el.groupId, []);
          selectedGroups.get(el.groupId)?.push(el);
        } else {
          selectedSingles.push(el);
        }
      }
    });

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      onMouseMove(e);
    };

    return (
      <>
        <svg
          ref={ref}
          className="w-full h-full"
          onMouseDown={onMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={onDoubleClick}
          onWheel={onWheel}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        >
          <defs>
            {/* Dot pattern for background */}
            <pattern
              id="dot-pattern"
              x="0"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <circle
                cx="1"
                cy="1"
                r="1.5"
                fill="var(--dot-color)"
                opacity="var(--dot-opacity)"
              />
            </pattern>

            {(colors as string[]).map((color) => (
              <marker
                key={color}
                id={`hollow-arrowhead-${color.replace("#", "")}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path
                  d="M 1 3 L 8 5 L 1 7"
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </marker>
            ))}
          </defs>

          {/* Background with dot pattern */}
          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.width}
            height={viewBox.height}
            fill="url(#dot-pattern)"
            className="pointer-events-none"
          />

          {/* Invisible text element for measurement */}
          <text
            ref={textMeasureRef}
            x="-9999"
            y="-9999"
            className="whitespace-pre"
            style={{
              fontSize: "16px",
              fontFamily: "inherit",
              pointerEvents: "none",
            }}
          >
            {measuringText}
          </text>

          {elements.map((el) => (
            <WhiteboardElementComponent
              key={el.id}
              element={el}
              currentTool={currentTool}
              editingState={editingState}
              liveEditText={liveEditText}
              isSelected={selectedElementIds.has(el.id)}
              measuredLastLineWidth={measuredLastLineWidth}
              onMouseDown={onMouseDown}
              isPreview={false}
              theme={theme}
              onTextChange={onTextChange}
              onMermaidSizeChange={onMermaidSizeChange}
            />
          ))}
          {drawingElement && (
            <WhiteboardElementComponent
              element={drawingElement}
              currentTool={currentTool}
              editingState={editingState}
              liveEditText={null}
              isSelected={selectedElementIds.has(drawingElement.id)}
              measuredLastLineWidth={measuredLastLineWidth}
              onMouseDown={onMouseDown}
              isPreview={false}
              theme={theme}
              onTextChange={onTextChange}
              onMermaidSizeChange={onMermaidSizeChange}
            />
          )}
          {shapePreview && (
            <WhiteboardElementComponent
              element={shapePreview}
              currentTool={currentTool}
              editingState={null}
              liveEditText={null}
              isSelected={false}
              measuredLastLineWidth={measuredLastLineWidth}
              onMouseDown={() => {}}
              isPreview={true}
              theme={theme}
            />
          )}

          {(currentTool === "line" || currentTool === "arrow") &&
            elements.map((el) => {
              if (el.type === "shape") {
                return (
                  <g key={`snap-points-${el.id}`}>
                    {getShapeConnectionPoints(el as ShapeElement).map(
                      (conn, i) => (
                        <circle
                          key={i}
                          cx={conn.point.x}
                          cy={conn.point.y}
                          r="5"
                          fill="rgba(0, 118, 255, 0.5)"
                          className="pointer-events-none"
                        />
                      )
                    )}
                  </g>
                );
              }
              return null;
            })}

          {snapPointInfo && (
            <circle
              cx={snapPointInfo.point.x}
              cy={snapPointInfo.point.y}
              r="8"
              fill="rgba(0, 118, 255, 0.8)"
              stroke="white"
              strokeWidth="2"
              className="pointer-events-none"
            />
          )}

          {selectedSingles.map((el) => {
            if (editingState?.id === el.id) return null;
            if (el.type === "line") {
              return (
                <LineSelectionControls
                  key={`sel-${el.id}`}
                  element={el}
                  onMouseDown={onMouseDown}
                />
              );
            }
            // Do not show rotation handle for lines
            if (
              el.type === "shape" ||
              el.type === "pen" ||
              el.type === "mermaid"
            ) {
              return (
                <SelectionControls
                  key={`sel-${el.id}`}
                  bounds={getElementBounds(el)}
                  angle={el.angle || 0}
                  onMouseDown={onMouseDown}
                  elementIds={[el.id]}
                />
              );
            }
            return null;
          })}

          {selectedSingles.map((el) => {
            if (el.type === "mermaid" && onEditMermaid) {
              const bounds = getElementBounds(el);
              return (
                <foreignObject
                  key={`edit-btn-${el.id}`}
                  x={bounds.x2 - 30}
                  y={bounds.y1 - 40}
                  width="120"
                  height="40"
                  style={{ overflow: "visible" }}
                >
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shadow-md h-8 text-xs gap-1"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditMermaid(el.id, (el as MermaidElement).code);
                    }}
                  >
                    <Edit size={12} /> Edit Diagram
                  </Button>
                </foreignObject>
              );
            }
            return null;
          })}

          {Array.from(selectedGroups.entries()).map(
            ([groupId, groupElements]) => {
              if (groupElements.some((el) => editingState?.id === el.id))
                return null;
              if (groupElements.some((el) => el.type !== "shape")) return null;

              const groupBounds = {
                x1: Math.min(
                  ...groupElements.map((el) => getElementBounds(el).x1)
                ),
                y1: Math.min(
                  ...groupElements.map((el) => getElementBounds(el).y1)
                ),
                x2: Math.max(
                  ...groupElements.map((el) => getElementBounds(el).x2)
                ),
                y2: Math.max(
                  ...groupElements.map((el) => getElementBounds(el).y2)
                ),
              };
              const groupAngle = groupElements[0]?.angle || 0;
              return (
                <SelectionControls
                  key={`sel-group-${groupId}`}
                  bounds={groupBounds}
                  angle={groupAngle}
                  onMouseDown={onMouseDown}
                  elementIds={groupElements.map((el) => el.id)}
                />
              );
            }
          )}

          {selectionArea && (
            <rect
              x={Math.min(selectionArea.x1, selectionArea.x2)}
              y={Math.min(selectionArea.y1, selectionArea.y2)}
              width={Math.abs(selectionArea.x1 - selectionArea.x2)}
              height={Math.abs(selectionArea.y1 - selectionArea.y2)}
              fill="rgba(0, 118, 255, 0.1)"
              stroke="rgba(0, 118, 255, 0.5)"
              strokeWidth="1"
            />
          )}
        </svg>
      </>
    );
  }
);
