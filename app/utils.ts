import { WhiteboardElement, Bounds } from "../types";

export const getElementBounds = (element: WhiteboardElement): Bounds => {
  let x1: number, y1: number, x2: number, y2: number;

  switch (element.type) {
    case "shape":
      x1 = Math.min(element.x1, element.x2);
      y1 = Math.min(element.y1, element.y2);
      x2 = Math.max(element.x1, element.x2);
      y2 = Math.max(element.y1, element.y2);
      break;
    case "line":
      if (!element.points || element.points.length === 0) {
        x1 = element.x1;
        y1 = element.y1;
        x2 = element.x2;
        y2 = element.y2;
      } else {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        element.points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
        x1 = minX;
        y1 = minY;
        x2 = maxX;
        y2 = maxY;
      }
      break;
    case "pen":
      if (element.points.length === 0) {
        x1 = 0;
        y1 = 0;
        x2 = 0;
        y2 = 0;
      } else {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        element.points.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
        x1 = minX;
        y1 = minY;
        x2 = maxX;
        y2 = maxY;
      }
      break;
    case "text":
      const { width, height } = measureText(
        element.text,
        element.fontSize,
        element.fontFamily
      );
      x1 = element.x;
      y1 = element.y;
      x2 = element.x + width;
      y2 = element.y + height;

      if (element.align === "center") {
        x1 -= width / 2;
        x2 -= width / 2;
      } else if (element.align === "right") {
        x1 -= width;
        x2 -= width;
      }
      break;
    case "mermaid":
      x1 = element.x;
      y1 = element.y;
      x2 = element.x + element.width;
      y2 = element.y + element.height;
      break;
    default:
      x1 = 0;
      y1 = 0;
      x2 = 0;
      y2 = 0;
  }
  return { x1, y1, x2, y2, width: x2 - x1, height: y2 - y1 };
};

export const getSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length < 2) return "";

  let d = `M ${points[0].x} ${points[0].y}`;

  if (points.length === 2) {
    return d + ` L ${points[1].x} ${points[1].y}`;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    d += ` Q ${p1.x} ${p1.y} ${midX} ${midY}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
};

export const computeAttachmentPoint = (
  bounds: Bounds,
  side: "top" | "right" | "bottom" | "left",
  offset: number
): { x: number; y: number } => {
  switch (side) {
    case "top":
      return { x: bounds.x1 + offset, y: bounds.y1 };
    case "right":
      return { x: bounds.x2, y: bounds.y1 + offset };
    case "bottom":
      return { x: bounds.x1 + offset, y: bounds.y2 };
    case "left":
      return { x: bounds.x1, y: bounds.y1 + offset };
  }
};

export const getNearestSide = (
  point: { x: number; y: number },
  bounds: Bounds
): {
  side: "top" | "right" | "bottom" | "left";
  offset: number;
  distance: number;
} => {
  const { x1, y1, x2, y2 } = bounds;

  // Clamp point to bounds for offset calculation if needed, but usually we project.
  // Distances to each side
  const distTop = Math.abs(point.y - y1);
  const distBottom = Math.abs(point.y - y2);
  const distLeft = Math.abs(point.x - x1);
  const distRight = Math.abs(point.x - x2);

  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  if (minDist === distTop) {
    return { side: "top", offset: point.x - x1, distance: distTop };
  } else if (minDist === distRight) {
    return { side: "right", offset: point.y - y1, distance: distRight };
  } else if (minDist === distBottom) {
    return { side: "bottom", offset: point.x - x1, distance: distBottom };
  } else {
    return { side: "left", offset: point.y - y1, distance: distLeft };
  }
};

export const clampSideOffset = (
  offset: number,
  side: "top" | "right" | "bottom" | "left",
  bounds: Bounds
): number => {
  const width = bounds.x2 - bounds.x1;
  const height = bounds.y2 - bounds.y1;
  const maxOffset = side === "top" || side === "bottom" ? width : height;
  return Math.max(0, Math.min(offset, maxOffset));
};

export const getArrowHead = (
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): string => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const angle = Math.atan2(dy, dx);
  const length = 15;
  const width = 10;

  const x1 = p2.x - length * Math.cos(angle - Math.PI / 6);
  const y1 = p2.y - length * Math.sin(angle - Math.PI / 6);
  const x2 = p2.x - length * Math.cos(angle + Math.PI / 6);
  const y2 = p2.y - length * Math.sin(angle + Math.PI / 6);

  return `M ${p2.x} ${p2.y} L ${x1} ${y1} L ${x2} ${y2} Z`;
};

let canvasContext: CanvasRenderingContext2D | null = null;

export const getEffectiveColor = (
  color: string,
  theme: string = "light"
): string => {
  if (color === "default") {
    return theme === "dark" ? "#ffffff" : "#000000";
  }
  return color;
};

export const measureText = (
  text: string,
  fontSize: number,
  fontFamily: string = "Inter, sans-serif"
): { width: number; height: number } => {
  if (typeof window === "undefined") return { width: 0, height: 0 };

  if (!canvasContext) {
    const canvas = document.createElement("canvas");
    canvasContext = canvas.getContext("2d");
  }

  if (!canvasContext) return { width: 0, height: 0 };

  canvasContext.font = `${fontSize}px ${fontFamily}`;

  const lines = text.split("\n");
  let maxWidth = 0;
  lines.forEach((line) => {
    const metrics = canvasContext!.measureText(line);
    if (metrics.width > maxWidth) maxWidth = metrics.width;
  });

  const lineHeight = fontSize * 1.2;
  const height = lines.length * lineHeight;

  return { width: maxWidth, height };
};

export const throttle = (func: (...args: any[]) => void, limit: number) => {
  let inThrottle: boolean;
  return function (this: any, ...args: any[]) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
