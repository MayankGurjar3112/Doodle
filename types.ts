export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export type Tool =
  | "selection"
  | "pan"
  | "pen"
  | "eraser"
  | "ai-diagram"
  | "text"
  | "rectangle"
  | "ellipse"
  | "rectangle-dashed"
  | "ellipse-dashed"
  | "line"
  | "arrow"
  | "rectangle-rounded"
  | "rectangle-rounded-dashed";

export interface PenElement {
  id: string;
  type: "pen";
  points: Point[];
  color: string;
  strokeWidth: number;
  locked?: boolean;
  groupId?: string;
  angle?: number;
}

export interface ShapeElement {
  id: string;
  type: "shape";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tool:
    | "rectangle"
    | "ellipse"
    | "rectangle-rounded"
    | "rectangle-rounded-dashed";
  color: string;
  strokeWidth: number;
  locked?: boolean;
  text?: string;
  groupId?: string;
  angle?: number;
  strokeStyle?: "solid" | "dashed";
}

export type Side = "top" | "right" | "bottom" | "left";

export interface ElementBinding {
  elementId: string;
  side: Side;
  sideOffset: number;
}

export interface LineElement {
  id: string;
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: Point[];
  tool: "line" | "arrow";
  color: string;
  strokeWidth: number;
  locked?: boolean;
  text?: string;
  groupId?: string;
  startBinding?: ElementBinding;
  endBinding?: ElementBinding;
  // Deprecated but kept for backward compatibility if needed, though plan said to remove or prioritize bindings.
  // Let's keep them optional for now to avoid breaking existing code immediately, but we will transition to bindings.
  startShapeId?: string;
  endShapeId?: string;
  angle?: number;
}

export interface TextElement {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  align: "left" | "center" | "right";
  width?: number;
  locked?: boolean;
  angle?: number;
  groupId?: string;
}

export interface MermaidElement {
  id: string;
  type: "mermaid";
  x: number;
  y: number;
  width: number;
  height: number;
  code: string;
  locked?: boolean;
  groupId?: string;
  angle?: number;
}

export type WhiteboardElement =
  | PenElement
  | ShapeElement
  | LineElement
  | TextElement
  | MermaidElement;

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  position: Point;
  photoURL?: string;
}

export enum MessageAuthor {
  USER = "user",
  GEMINI = "gemini",
  COLLABORATOR = "collaborator",
}

export interface ChatMessage {
  id: number | string;
  author: MessageAuthor;
  text: string;
  authorName?: string;
  authorColor?: string;
  authorPhotoURL?: string;
}

export type ViewMode = "canvas" | "document" | "both";
