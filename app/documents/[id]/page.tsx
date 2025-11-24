"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Whiteboard = dynamic(
  () => import("@/app/components/Whiteboard").then((mod) => mod.Whiteboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ),
  }
);
import { Toolbar } from "@/app/components/Toolbar";
import { ChatPanel } from "@/app/components/ChatPanel";
import { UserCursor } from "@/app/components/UserCursor";
import { ZoomControls } from "@/app/components/ZoomControls";
import { TopBar } from "@/app/components/TopBar";
import { useTheme } from "next-themes";
import {
  WhiteboardElement,
  Tool,
  Collaborator,
  Point,
  ChatMessage,
  MessageAuthor,
  ShapeElement,
  LineElement,
  ElementBinding,
  TextElement,
  MermaidElement,
} from "@/types";
import {
  getElementBounds,
  computeAttachmentPoint,
  getNearestSide,
  throttle,
} from "@/app/utils";
import { nanoid } from "nanoid";

import { DocumentPanel } from "@/app/components/DocumentPanel";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from "@/components/ui/input";
import { ShareModal } from "@/app/components/ShareModal";
import { MermaidEditDialog } from "@/app/components/MermaidEditDialog";
import { useRoom } from "@/app/hooks/useRoom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/app/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { CallFloatingWindow } from "@/app/components/CallFloatingWindow";

// Helper function to get effective color based on theme removed as it was unused

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const SNAP_RADIUS = 20;

const DEFAULT_SHAPE_SIZES = {
  rectangle: { width: 150, height: 100 },
  "rectangle-rounded": { width: 150, height: 100 },
  "rectangle-dashed": { width: 150, height: 100 },
  "rectangle-rounded-dashed": { width: 150, height: 100 },
  ellipse: { width: 100, height: 100 },
  "ellipse-dashed": { width: 100, height: 100 },
};

type Action =
  | "none"
  | "drawing"
  | "moving"
  | "selecting"
  | "panning"
  | "erasing"
  | "resizing"
  | "rotating"
  | "line-editing-start"
  | "line-editing-end"
  | "line-segment-editing";
type EditingState = { id: string };

type ConnectionPointInfo = { point: Point; direction: "N" | "S" | "E" | "W" };

const getShapeConnectionPoints = (
  element: ShapeElement
): ConnectionPointInfo[] => {
  const bounds = getElementBounds(element);
  const midX = bounds.x1 + bounds.width / 2;
  const midY = bounds.y1 + bounds.height / 2;

  return [
    { point: { x: midX, y: bounds.y1 }, direction: "N" },
    { point: { x: midX, y: bounds.y2 }, direction: "S" },
    { point: { x: bounds.x1, y: midY }, direction: "W" },
    { point: { x: bounds.x2, y: midY }, direction: "E" },
  ];
};

const calculateOrthogonalPath = (
  startConn: ConnectionPointInfo,
  endConn: ConnectionPointInfo
): Point[] => {
  const { point: p1, direction: d1 } = startConn;
  const { point: p2, direction: d2 } = endConn;
  const points: Point[] = [p1];
  const OFFSET = 20;

  const current = { ...p1 };

  // Initial segment from start point
  if (d1 === "N") current.y -= OFFSET;
  else if (d1 === "S") current.y += OFFSET;
  else if (d1 === "W") current.x -= OFFSET;
  else if (d1 === "E") current.x += OFFSET;
  points.push({ ...current });

  // Final segment to end point
  const last = { ...p2 };
  if (d2 === "N") last.y -= OFFSET;
  else if (d2 === "S") last.y += OFFSET;
  else if (d2 === "W") last.x -= OFFSET;
  else if (d2 === "E") last.x += OFFSET;

  const isStartHorizontal = d1 === "E" || d1 === "W";

  if (isStartHorizontal) {
    // Bend from horizontal to vertical
    current.x = last.x;
    points.push({ ...current });

    // Final vertical segment
    current.y = last.y;
    points.push({ ...current });
  } else {
    // Start is vertical
    // Bend from vertical to horizontal
    current.y = last.y;
    points.push({ ...current });

    // Final horizontal segment
    current.x = last.x;
    points.push({ ...current });
  }

  points.push(last);
  points.push(p2);

  // Simplify path by removing redundant points
  const simplified = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p_prev = simplified[simplified.length - 1];
    const p_curr = points[i];
    const p_next = points[i + 1];
    const isCollinear =
      (p_prev.x === p_curr.x && p_curr.x === p_next.x) ||
      (p_prev.y === p_curr.y && p_curr.y === p_next.y);
    if (!isCollinear) {
      simplified.push(p_curr);
    }
  }
  simplified.push(points[points.length - 1]);

  return simplified;
};

const createElement = (
  id: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  tool: Tool,
  color: string,
  strokeWidth: number
): WhiteboardElement | null => {
  switch (tool) {
    case "rectangle":
    case "ellipse":
    case "rectangle-rounded":
      return {
        id,
        type: "shape",
        x1,
        y1,
        x2,
        y2,
        tool,
        color,
        strokeWidth,
        locked: false,
        text: "",
        angle: 0,
        strokeStyle: "solid",
      };
    case "rectangle-dashed":
      return {
        id,
        type: "shape",
        tool: "rectangle",
        x1,
        y1,
        x2,
        y2,
        color,
        strokeWidth,
        locked: false,
        text: "",
        angle: 0,
        strokeStyle: "dashed",
      };
    case "rectangle-rounded-dashed":
      return {
        id,
        type: "shape",
        tool: "rectangle-rounded",
        x1,
        y1,
        x2,
        y2,
        color,
        strokeWidth,
        locked: false,
        text: "",
        angle: 0,
        strokeStyle: "dashed",
      };
    case "ellipse-dashed":
      return {
        id,
        type: "shape",
        tool: "ellipse",
        x1,
        y1,
        x2,
        y2,
        color,
        strokeWidth,
        locked: false,
        text: "",
        angle: 0,
        strokeStyle: "dashed",
      };
    case "line":
    case "arrow":
      const line: LineElement = {
        id,
        type: "line",
        x1,
        y1,
        x2,
        y2,
        tool,
        color,
        strokeWidth,
        locked: false,
        text: "",
        angle: 0,
      };
      line.points = [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ];
      return line;
    case "pen":
      return {
        id,
        type: "pen",
        points: [{ x: x1, y: y1 }],
        color,
        strokeWidth,
        locked: false,
        angle: 0,
      };
    case "text":
      return {
        id,
        type: "text",
        x: x1,
        y: y1,
        text: "",
        fontSize: 16,
        fontFamily: "Inter, sans-serif",
        color,
        align: "left",
        locked: false,
        angle: 0,
      };
    default:
      return null;
  }
};

const isPointInsideElement = (
  point: Point,
  element: WhiteboardElement
): boolean => {
  const bounds = getElementBounds(element);
  const centerX = bounds.x1 + (bounds.x2 - bounds.x1) / 2;
  const centerY = bounds.y1 + (bounds.y2 - bounds.y1) / 2;

  // Inverse rotate the point to check against the unrotated element shape
  const angle = (-(element.angle || 0) * Math.PI) / 180;
  const rotatedX =
    Math.cos(angle) * (point.x - centerX) -
    Math.sin(angle) * (point.y - centerY) +
    centerX;
  const rotatedY =
    Math.sin(angle) * (point.x - centerX) +
    Math.cos(angle) * (point.y - centerY) +
    centerY;

  const { x, y } = { x: rotatedX, y: rotatedY };

  switch (element.type) {
    case "shape":
      const { x1, y1, x2, y2, tool } = element;
      const minX = Math.min(x1, x2),
        maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2),
        maxY = Math.max(y1, y2);

      if (x < minX - 5 || x > maxX + 5 || y < minY - 5 || y > maxY + 5)
        return false;

      if (
        tool === "rectangle" ||
        tool === "rectangle-rounded" ||
        tool === "rectangle-rounded-dashed"
      )
        return true;
      if (tool === "ellipse") {
        const cx = (x1 + x2) / 2,
          cy = (y1 + y2) / 2;
        const rx = Math.abs(x1 - x2) / 2,
          ry = Math.abs(y1 - y2) / 2;
        return (
          rx > 0 &&
          ry > 0 &&
          (x - cx) ** 2 / rx ** 2 + (y - cy) ** 2 / ry ** 2 <= 1
        );
      }
      return false;
    case "line": {
      const { points, strokeWidth } = element;
      const tolerance = Math.max(5, strokeWidth / 2) ** 2;
      if (!points) return false;

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const distSq = (
          px: number,
          py: number,
          lx1: number,
          ly1: number,
          lx2: number,
          ly2: number
        ) => {
          const l2 = (lx1 - lx2) ** 2 + (ly1 - ly2) ** 2;
          if (l2 === 0) return (px - lx1) ** 2 + (py - ly1) ** 2;
          let t = ((px - lx1) * (lx2 - lx1) + (py - ly1) * (ly2 - ly1)) / l2;
          t = Math.max(0, Math.min(1, t));
          return (
            (px - (lx1 + t * (lx2 - lx1))) ** 2 +
            (py - (ly1 + t * (ly2 - ly1))) ** 2
          );
        };
        if (distSq(x, y, p1.x, p1.y, p2.x, p2.y) < tolerance) return true;
      }
      return false;
    }
    case "pen":
      return element.points.some((p, i) => {
        if (i === 0) return false;
        const prev = element.points[i - 1];
        const lineSegment: LineElement = {
          id: "",
          type: "line",
          tool: "line",
          points: [prev, p],
          x1: prev.x,
          y1: prev.y,
          x2: p.x,
          y2: p.y,
          color: "",
          strokeWidth: element.strokeWidth,
          angle: element.angle,
        };
        return isPointInsideElement(point, lineSegment);
      });

    case "text":
      return (
        x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2
      );
    case "mermaid":
      return (
        x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2
      );
    default:
      return false;
  }
};

const App: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [docName, setDocName] = useState("Untitled");
  const [docContent, setDocContent] = useState(""); // For markdown panel
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);

  const [isPublic, setIsPublic] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Only connect to room if we have a valid document and user (or public access)
  const shouldConnect = !error && !isLoadingDoc && (!!user || isPublic);

  useEffect(() => {
    console.log("Connection Debug:", {
      id,
      error,
      isLoadingDoc,
      user: !!user,
      isPublic,
      shouldConnect,
    });
  }, [id, error, isLoadingDoc, user, isPublic, shouldConnect]);

  // Use Firebase Room Hook
  const {
    elements: remoteElements,
    setElements: setRemoteElements,
    collaborators,
    updateCursor,
    currentUser,
    authError,
    userId,
    messages: teamMessages,
    sendMessage: sendTeamMessage,
    activeCallParticipants,
    joinCall,
    leaveCall: leaveCallRoom,
  } = useRoom(shouldConnect ? id : "", []);

  const [history, setHistory] = useState<WhiteboardElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sync remote elements to local history when they change (and we are not editing)
  useEffect(() => {
    if (remoteElements && remoteElements.length > 0) {
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[historyIndex] = remoteElements;
        return newHistory;
      });
    }
  }, [remoteElements]);

  const elements = history[historyIndex] || [];

  const setElements = useCallback(
    (
      updater: React.SetStateAction<WhiteboardElement[]>,
      options?: { addToHistory: boolean }
    ) => {
      const newElements =
        typeof updater === "function"
          ? updater(history[historyIndex] || [])
          : updater;

      if (JSON.stringify(newElements) === JSON.stringify(history[historyIndex]))
        return;

      // Update Firebase
      setRemoteElements(newElements);

      if (options?.addToHistory === false) {
        const newHistory = [...history];
        newHistory[historyIndex] = newElements;
        setHistory(newHistory);
      } else {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, newElements]);
        setHistoryIndex(newHistory.length);
      }
    },
    [history, historyIndex, setRemoteElements]
  );

  // Fetch document metadata and check access
  useEffect(() => {
    if (!id || authLoading) return;

    const fetchDoc = async () => {
      setIsLoadingDoc(true);
      setError(null);
      try {
        const res = await fetch(`/api/documents/${id}`);
        if (res.ok) {
          const data = await res.json();

          // Set permission state
          setIsPublic(data.isPublic || false);
          setAllowedEmails(data.allowedEmails || []);
          setOwnerId(data.authorId);
          const owner = user ? data.authorId === user.uid : false;
          setIsOwner(owner);

          // Check permissions
          const hasAccess =
            owner ||
            data.isPublic ||
            (user &&
              user.email &&
              data.allowedEmails &&
              data.allowedEmails.includes(user.email));

          if (!hasAccess) {
            setError("You do not have permission to view this document.");
            setIsLoadingDoc(false);
            return;
          }

          setDocName(data.name);
          if (data.content && data.content.text) {
            setDocContent(data.content.text);
          }
        } else {
          if (res.status === 404) {
            setError("Document not found");
          } else {
            setError("Failed to load document");
          }
        }
      } catch (e) {
        console.error("Failed to load document", e);
        setError("An unexpected error occurred");
      } finally {
        setIsLoadingDoc(false);
      }
    };

    if (user || !authLoading) {
      fetchDoc();
    }
  }, [id, user, authLoading]);

  const handleUpdatePermissions = async (
    newIsPublic: boolean,
    newAllowedEmails: string[]
  ) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublic: newIsPublic,
          allowedEmails: newAllowedEmails,
        }),
      });

      if (res.ok) {
        setIsPublic(newIsPublic);
        setAllowedEmails(newAllowedEmails);
      } else {
        console.error("Failed to update permissions");
      }
    } catch (e) {
      console.error("Error updating permissions", e);
    }
  };

  // Auto-save
  useEffect(() => {
    if (!id || error || isLoadingDoc || (!user && !isPublic)) return;

    setSaveStatus("saving");

    const saveTimeout = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: {
              text: docContent,
              elements: elements, // Save elements to MongoDB
            },
          }),
        });
        setSaveStatus("saved");
      } catch (e) {
        console.error("Failed to save", e);
        setSaveStatus("error");
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [elements, docContent, id, error, isLoadingDoc, user, isPublic]);

  const { resolvedTheme } = useTheme();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [action, setAction] = useState<Action>("none");
  const [currentTool, setCurrentTool] = useState<Tool>("selection");
  const [currentColor, setCurrentColor] = useState<string>("default");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(
    new Set()
  );
  const [startPoint, setStartPoint] = useState<Point>({ x: 0, y: 0 });
  const [selectionArea, setSelectionArea] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [editingState, setEditingState] = useState<EditingState | null>(null);
  const [liveEditText, setLiveEditText] = useState<string | null>(null);
  const [drawingElement, setDrawingElement] =
    useState<WhiteboardElement | null>(null);
  const [shapePreview, setShapePreview] = useState<WhiteboardElement | null>(
    null
  );
  const [toolbarPosition, setToolbarPosition] = useState({ x: 20, y: 80 });
  const [viewBox, setViewBox] = useState({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setViewBox((prev) => ({
        ...prev,
        width: window.innerWidth,
        height: window.innerHeight,
      }));
    }
  }, []);
  const [zoom, setZoom] = useState(1);
  const [snapPointInfo, setSnapPointInfo] = useState<{
    point: Point;
    shapeId: string;
    direction: "N" | "S" | "E" | "W";
  } | null>(null);
  const [actionDetail, setActionDetail] = useState<{
    handle?: string;
    elementId?: string;
    segmentIndex?: number;
  } | null>(null);
  const [canBringForward, setCanBringForward] = useState(false);
  const [canSendBackward, setCanSendBackward] = useState(false);
  const [viewMode, setViewMode] = useState<"document" | "both" | "canvas">(
    "canvas"
  );
  const [splitRatio, setSplitRatio] = useState(0.5);
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  const previousToolRef = useRef<Tool>(currentTool);
  const textMeasureRef = useRef<SVGTextElement>(null);

  const [geminiMessages, setGeminiMessages] = useState<ChatMessage[]>([]);
  const [isMermaidDialogOpen, setIsMermaidDialogOpen] = useState(false);
  const [mermaidEditId, setMermaidEditId] = useState<string | null>(null);
  const [mermaidEditCode, setMermaidEditCode] = useState<string>("");
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callToken, setCallToken] = useState("");

  const handleToggleCall = useCallback(async () => {
    if (isCallOpen) {
      setIsCallOpen(false);
      setCallToken("");
      leaveCallRoom();
    } else {
      if (!user) return; // Should be handled by UI state but good check
      try {
        const username =
          user.displayName || user.email?.split("@")[0] || "User";
        const res = await fetch(
          `/api/livekit/token?room=${id}&username=${encodeURIComponent(
            username
          )}`
        );
        const data = await res.json();
        if (data.token) {
          setCallToken(data.token);
          setIsCallOpen(true);
          joinCall();
        }
      } catch (error) {
        console.error("Failed to join call", error);
      }
    }
  }, [isCallOpen, id, user, joinCall, leaveCallRoom]);

  useEffect(() => {
    setGeminiMessages([
      {
        author: MessageAuthor.GEMINI,
        text: "Hello! I'm your AI assistant. Ask me anything about diagrams, flowcharts, or brainstorming ideas!",
        id: Date.now(),
      },
    ]);
  }, []);

  const whiteboardRef = useRef<SVGSVGElement>(null);

  const handleUndo = useCallback(
    () => historyIndex > 0 && setHistoryIndex((prev) => prev - 1),
    [historyIndex]
  );
  const handleRedo = useCallback(
    () =>
      historyIndex < history.length - 1 && setHistoryIndex((prev) => prev + 1),
    [historyIndex, history.length]
  );

  const prevThemeRef = useRef(resolvedTheme);

  useEffect(() => {
    if (
      prevThemeRef.current &&
      resolvedTheme &&
      prevThemeRef.current !== resolvedTheme
    ) {
      const newDrawColor = resolvedTheme === "dark" ? "#e2e8f0" : "#18181b";
      const oldDrawColor = resolvedTheme === "dark" ? "#18181b" : "#e2e8f0";

      setCurrentColor(newDrawColor);

      setElements(
        (prevElements) =>
          prevElements.map((el) => {
            if (
              (el.type === "shape" ||
                el.type === "line" ||
                el.type === "text" ||
                el.type === "pen") &&
              el.color.toUpperCase() === oldDrawColor.toUpperCase()
            ) {
              return { ...el, color: newDrawColor };
            }
            return el;
          }),
        { addToHistory: true }
      );
    }
    prevThemeRef.current = resolvedTheme;
  }, [resolvedTheme, setElements]);

  const handleGroup = useCallback(() => {
    const groupId = nanoid();
    setElements((prev) =>
      prev.map((el) =>
        selectedElementIds.has(el.id) ? { ...el, groupId } : el
      )
    );
  }, [selectedElementIds, setElements]);

  const handleUngroup = useCallback(() => {
    const groupIdsToUngroup = new Set<string>();
    selectedElementIds.forEach((id) => {
      const el = elements.find((e) => e.id === id);
      if (el?.groupId) groupIdsToUngroup.add(el.groupId);
    });

    setElements((prev) =>
      prev.map((el) => {
        if (el.groupId && groupIdsToUngroup.has(el.groupId)) {
          const { groupId, ...rest } = el;
          return rest as WhiteboardElement;
        }
        return el;
      })
    );
  }, [elements, selectedElementIds, setElements]);

  const handleGenerateDiagram = useCallback(async () => {
    if (!promptText.trim()) return;

    setIsGeneratingDiagram(true);
    try {
      const res = await fetch("/api/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: promptText }),
      });
      const data = await res.json();
      if (data.code) {
        const id = nanoid();
        const width = 600;
        const height = 400;

        // Determine position
        let x = viewBox.x + viewBox.width / 2 - width / 2;
        let y = viewBox.y + viewBox.height / 2 - height / 2;

        // Check if current view is crowded (simple heuristic: if many elements are in view)
        const elementsInView = elements.filter((el) => {
          const b = getElementBounds(el);
          return (
            b.x1 < viewBox.x + viewBox.width &&
            b.x2 > viewBox.x &&
            b.y1 < viewBox.y + viewBox.height &&
            b.y2 > viewBox.y
          );
        });

        if (elementsInView.length > 5) {
          // Place outside to the right
          x = viewBox.x + viewBox.width + 100;
          y = viewBox.y;

          // Scroll to new position
          setViewBox((prev) => ({ ...prev, x: x - 50, y: y - 50 }));
        }

        const newElement: MermaidElement = {
          id,
          type: "mermaid",
          x,
          y,
          width,
          height,
          code: data.code,
          locked: false,
          angle: 0,
        };

        setElements((prev) => [...prev, newElement], { addToHistory: true });
        setIsPromptDialogOpen(false);
        setPromptText("");
        setCurrentTool("selection");
      }
    } catch (error) {
      console.error("Failed to generate diagram", error);
    } finally {
      setIsGeneratingDiagram(false);
    }
  }, [promptText, viewBox, elements, setElements]);

  const handleEditMermaid = useCallback((id: string, code: string) => {
    setMermaidEditId(id);
    setMermaidEditCode(code);
    setIsMermaidDialogOpen(true);
  }, []);

  const handleSaveMermaid = useCallback(
    (newCode: string) => {
      if (mermaidEditId) {
        setElements(
          (prev) =>
            prev.map((el) => {
              if (el.id === mermaidEditId && el.type === "mermaid") {
                return { ...el, code: newCode };
              }
              return el;
            }),
          { addToHistory: true }
        );
      }
      setIsMermaidDialogOpen(false);
      setMermaidEditId(null);
    },
    [mermaidEditId, setElements]
  );

  useEffect(() => {
    if (currentTool === "ai-diagram") {
      setIsPromptDialogOpen(true);
    }
  }, [currentTool]);

  const handleMermaidSizeChange = useCallback(
    (id: string, width: number, height: number) => {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (el.id === id && el.type === "mermaid") {
              if (
                Math.abs(el.width - width) > 1 ||
                Math.abs(el.height - height) > 1
              ) {
                return { ...el, width, height };
              }
            }
            return el;
          }),
        { addToHistory: false }
      );
    },
    [setElements]
  );

  const handlePrint = useCallback(() => {
    if (!whiteboardRef.current) return;

    // Determine which elements to print: selected ones or all if none selected
    const elementsToPrint =
      selectedElementIds.size > 0
        ? elements.filter((el) => selectedElementIds.has(el.id))
        : elements;

    if (elementsToPrint.length === 0) {
      alert("No diagrams to print");
      return;
    }

    // Calculate bounds of elements to print
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    elementsToPrint.forEach((el) => {
      const bounds = getElementBounds(el);
      minX = Math.min(minX, bounds.x1);
      minY = Math.min(minY, bounds.y1);
      maxX = Math.max(maxX, bounds.x2);
      maxY = Math.max(maxY, bounds.y2);
    });

    // Add padding
    const padding = 20;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    // Create a temporary SVG with only the selected elements
    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    tempSvg.setAttribute("width", String(width));
    tempSvg.setAttribute("height", String(height));
    tempSvg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
    tempSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Clone the elements from the whiteboard
    const whiteboardSvg = whiteboardRef.current;
    elementsToPrint.forEach((el) => {
      const domElement = whiteboardSvg.querySelector(`[data-id="${el.id}"]`);
      if (domElement) {
        tempSvg.appendChild(domElement.cloneNode(true));
      }
    });

    const svgData = new XMLSerializer().serializeToString(tempSvg);

    // Create a temporary iframe for printing
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.top = "-10000px";
    printFrame.style.left = "-10000px";
    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentWindow?.document;
    if (printDocument) {
      printDocument.open();
      printDocument.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Diagram</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              svg {
                max-width: 100%;
                max-height: 100vh;
                height: auto;
              }
              @media print {
                body {
                  padding: 0;
                }
                svg {
                  max-width: 100%;
                  max-height: none;
                }
              }
            </style>
          </head>
          <body>
            ${svgData}
          </body>
        </html>
      `);
      printDocument.close();

      // Wait for content to load, then print
      printFrame.contentWindow?.focus();
      setTimeout(() => {
        printFrame.contentWindow?.print();
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 100);
      }, 250);
    }
  }, [setElements]);

  const toggleLock = useCallback(
    (ids: string[]) => {
      setElements(
        (prevElements) =>
          prevElements.map((el) =>
            ids.includes(el.id) ? { ...el, locked: !el.locked } : el
          ),
        { addToHistory: true }
      );
    },
    [setElements]
  );

  const handleClear = useCallback(
    () => setElements([], { addToHistory: true }),
    [setElements]
  );

  const handleZoom = useCallback(
    (newZoomLevel: number, center: Point) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomLevel));
      const newWidth = window.innerWidth / newZoom;
      const newHeight = window.innerHeight / newZoom;
      const newX =
        center.x - (center.x - viewBox.x) * (newWidth / viewBox.width);
      const newY =
        center.y - (center.y - viewBox.y) * (newHeight / viewBox.height);
      setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
      setZoom(newZoom);
    },
    [viewBox, setViewBox, setZoom]
  );

  const setZoomLevel = useCallback(
    (level: number) => {
      const center = {
        x: viewBox.x + viewBox.width / 2,
        y: viewBox.y + viewBox.height / 2,
      };
      handleZoom(level, center);
    },
    [viewBox, handleZoom]
  );

  const handleDelete = useCallback(() => {
    if (selectedElementIds.size === 0) return;
    setElements((prev) => prev.filter((el) => !selectedElementIds.has(el.id)), {
      addToHistory: true,
    });
    setSelectedElementIds(new Set());
  }, [selectedElementIds, setElements]);

  const handleReorder = useCallback(
    (direction: "front" | "back" | "forward" | "backward") => {
      if (selectedElementIds.size === 0) return;

      setElements(
        (prevElements) => {
          const newElements = [...prevElements];

          switch (direction) {
            case "front": {
              const selected = newElements.filter((el) =>
                selectedElementIds.has(el.id)
              );
              const others = newElements.filter(
                (el) => !selectedElementIds.has(el.id)
              );
              return [...others, ...selected];
            }
            case "back": {
              const selected = newElements.filter((el) =>
                selectedElementIds.has(el.id)
              );
              const others = newElements.filter(
                (el) => !selectedElementIds.has(el.id)
              );
              return [...selected, ...others];
            }
            case "forward": {
              for (let i = newElements.length - 2; i >= 0; i--) {
                if (
                  selectedElementIds.has(newElements[i].id) &&
                  !selectedElementIds.has(newElements[i + 1].id)
                ) {
                  [newElements[i], newElements[i + 1]] = [
                    newElements[i + 1],
                    newElements[i],
                  ];
                }
              }
              return newElements;
            }
            case "backward": {
              for (let i = 1; i < newElements.length; i++) {
                if (
                  selectedElementIds.has(newElements[i].id) &&
                  !selectedElementIds.has(newElements[i - 1].id)
                ) {
                  [newElements[i], newElements[i - 1]] = [
                    newElements[i - 1],
                    newElements[i],
                  ];
                }
              }
              return newElements;
            }
          }
          return prevElements;
        },
        { addToHistory: true }
      );
    },
    [selectedElementIds, setElements]
  );

  useEffect(() => {
    if (selectedElementIds.size === 0 || elements.length < 2) {
      setCanBringForward(false);
      setCanSendBackward(false);
      return;
    }

    const canBringForwardValue = elements.some(
      (el, i, arr) =>
        selectedElementIds.has(el.id) &&
        i < arr.length - 1 &&
        !selectedElementIds.has(arr[i + 1].id)
    );
    setCanBringForward(canBringForwardValue);

    const canSendBackwardValue = elements.some(
      (el, i) =>
        selectedElementIds.has(el.id) &&
        i > 0 &&
        !selectedElementIds.has(elements[i - 1].id)
    );
    setCanSendBackward(canSendBackwardValue);
  }, [selectedElementIds, elements]);

  // Prevent browser zoom, only allow canvas zoom
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Use passive: false to allow preventDefault
    document.addEventListener("wheel", preventBrowserZoom, { passive: false });
    return () => {
      document.removeEventListener("wheel", preventBrowserZoom);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingState || (e.target as HTMLElement)?.closest("input, textarea"))
        return;

      switch (e.key.toLowerCase()) {
        case "alt":
          if (currentTool !== "pan" && action === "none") {
            previousToolRef.current = currentTool;
            setCurrentTool("pan");
          }
          break;
        case "backspace":
        case "delete":
          e.preventDefault();
          if (e.shiftKey) {
            handleClear();
          } else {
            handleDelete();
          }
          break;
        case "s":
          setCurrentTool("selection");
          break;
        case "p":
          setCurrentTool("pen");
          break;
        case "e":
          setCurrentTool("eraser");
          break;
        case "b":
          setCurrentTool(e.shiftKey ? "rectangle-dashed" : "rectangle");
          break;
        case "o":
          setCurrentTool(
            e.shiftKey ? "rectangle-rounded-dashed" : "rectangle-rounded"
          );
          break;
        case "c":
          setCurrentTool(e.shiftKey ? "ellipse-dashed" : "ellipse");
          break;
        case "l":
          setCurrentTool("line");
          break;
        case "a":
          setCurrentTool("arrow");
          break;
        case "g":
          if (e.shiftKey) {
            handleUngroup();
          } else {
            handleGroup();
          }
          break;
        case "l":
          if (e.shiftKey) {
            toggleLock(Array.from(selectedElementIds));
          }
          break;
        case "[":
          if (e.shiftKey) {
            handleReorder("back");
          } else {
            handleReorder("backward");
          }
          break;
        case "]":
          if (e.shiftKey) {
            handleReorder("front");
          } else {
            handleReorder("forward");
          }
          break;
        case "u":
          handleUndo();
          break;
        case "r":
          handleRedo();
          break;
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoomLevel(Math.min(zoom * 1.2, MAX_ZOOM));
          }
          break;
        case "-":
        case "_":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoomLevel(Math.max(zoom / 1.2, MIN_ZOOM));
          }
          break;
        case "0":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoomLevel(1);
          }
          break;
        case "p":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handlePrint();
          }
          break;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "alt") {
        if (currentTool === "pan" && previousToolRef.current) {
          setCurrentTool(previousToolRef.current);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    currentTool,
    action,
    editingState,
    handleGroup,
    handleUngroup,
    handleUndo,
    handleRedo,
    handlePrint,
    handleReorder,
    toggleLock,
    selectedElementIds,
    handleDelete,
    handleClear,
    zoom,
    setZoomLevel,
  ]);

  useEffect(() => {
    const handleResize = () => {
      const isSplit = viewMode === "both";
      const newWidth = isSplit
        ? window.innerWidth * splitRatio
        : window.innerWidth;
      const newHeight = window.innerHeight;

      setViewBox((prev) => ({
        x: prev.x,
        y: prev.y,
        width: newWidth / zoom,
        height: newHeight / zoom,
      }));

      // Clamp toolbar position
      setToolbarPosition((prev) => ({
        x: Math.min(prev.x, newWidth - 80),
        y: Math.min(prev.y, newHeight - 100),
      }));
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [zoom, viewMode, splitRatio]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSplit) return;

      const newRatio = e.clientX / window.innerWidth;
      const clampedRatio = Math.max(0.2, Math.min(0.8, newRatio));
      setSplitRatio(clampedRatio);

      // Update viewBox width to maintain zoom
      const newWidth = window.innerWidth * clampedRatio;
      setViewBox((prev) => ({
        ...prev,
        width: newWidth / zoom,
      }));
    };

    const handleMouseUp = () => {
      setIsResizingSplit(false);
    };

    if (isResizingSplit) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSplit, zoom]);

  const getPoint = (
    e: React.MouseEvent | React.WheelEvent | React.TouchEvent | TouchEvent
  ): Point => {
    if (!whiteboardRef.current) return { x: 0, y: 0 };
    const svg = whiteboardRef.current;
    const CTM = svg.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };

    let clientX, clientY;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - CTM.e) / CTM.a,
      y: (clientY - CTM.f) / CTM.d,
    };
  };

  const getElementAtPosition = (
    x: number,
    y: number
  ): WhiteboardElement | null => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const element = elements[i];
      if (isPointInsideElement({ x, y }, element)) {
        return element;
      }
    }
    return null;
  };

  const findSnapPoint = (
    cursor: Point,
    elementToIgnoreId: string | null = null
  ): { connectionPoint: ConnectionPointInfo; shapeId: string } | null => {
    let closestSnapPoint = null;
    let minDistance = SNAP_RADIUS / zoom;

    for (const element of elements) {
      if (element.type === "shape" && element.id !== elementToIgnoreId) {
        const connectionPoints = getShapeConnectionPoints(
          element as ShapeElement
        );
        for (const connPoint of connectionPoints) {
          const distance = Math.sqrt(
            Math.pow(cursor.x - connPoint.point.x, 2) +
              Math.pow(cursor.y - connPoint.point.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestSnapPoint = {
              connectionPoint: connPoint,
              shapeId: element.id,
            };
          }
        }
      }
    }
    return closestSnapPoint;
  };

  const moveElements = (dx: number, dy: number, idsToMove: Set<string>) => {
    setElements(
      (prevElements) => {
        const selectedAreLocked = prevElements.some(
          (el) => idsToMove.has(el.id) && el.locked
        );
        if (selectedAreLocked) return prevElements;

        const allElementsMap = new Map<string, WhiteboardElement>(
          prevElements.map((el) => [el.id, el])
        );

        // First, move the selected elements
        const movedElements = prevElements.map((el) => {
          if (idsToMove.has(el.id)) {
            const newEl = { ...el };
            switch (newEl.type) {
              case "pen":
                newEl.points = newEl.points.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                }));
                break;
              case "shape":
                newEl.x1 += dx;
                newEl.y1 += dy;
                newEl.x2 += dx;
                newEl.y2 += dy;
                break;
              case "line":
                newEl.x1 += dx;
                newEl.y1 += dy;
                newEl.x2 += dx;
                newEl.y2 += dy;
                newEl.points = newEl.points?.map((p) => ({
                  x: p.x + dx,
                  y: p.y + dy,
                }));
                break;
              case "mermaid":
                newEl.x += dx;
                newEl.y += dy;
                break;
            }
            allElementsMap.set(el.id, newEl); // Update map with moved element
            return newEl;
          }
          return el;
        });

        // Then, update connected lines
        return movedElements.map((el) => {
          if (
            el.type === "line" &&
            (idsToMove.has(el.startShapeId!) || idsToMove.has(el.endShapeId!))
          ) {
            const startShape = allElementsMap.get(el.startShapeId!) as
              | ShapeElement
              | undefined;
            const endShape = allElementsMap.get(el.endShapeId!) as
              | ShapeElement
              | undefined;

            if (startShape && endShape) {
              const startConns = getShapeConnectionPoints(startShape);
              const endConns = getShapeConnectionPoints(endShape);

              let bestPair = {
                start: startConns[0],
                end: endConns[0],
                dist: Infinity,
              };

              for (const sc of startConns) {
                for (const ec of endConns) {
                  const dist =
                    Math.abs(sc.point.x - ec.point.x) +
                    Math.abs(sc.point.y - ec.point.y);
                  if (dist < bestPair.dist) {
                    bestPair = { start: sc, end: ec, dist };
                  }
                }
              }

              const newEl = { ...el };
              newEl.x1 = bestPair.start.point.x;
              newEl.y1 = bestPair.start.point.y;
              newEl.x2 = bestPair.end.point.x;
              newEl.y2 = bestPair.end.point.y;
              newEl.points = calculateOrthogonalPath(
                bestPair.start,
                bestPair.end
              );
              return newEl;
            }
          }
          return el;
        });
      },
      { addToHistory: false }
    );
  };

  const handleTextSubmit = (finalText?: string) => {
    if (editingState) {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (
              el.id === editingState.id &&
              (el.type === "shape" || el.type === "line" || el.type === "text")
            ) {
              const textToSet =
                finalText !== undefined ? finalText : el.text || "";
              return { ...el, text: textToSet };
            }
            return el;
          }),
        { addToHistory: true }
      );
      setEditingState(null);
      setLiveEditText(null);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || editingState) {
        if (editingState) {
          handleTextSubmit(liveEditText ?? undefined);
        }
        return;
      }
      const point = getPoint(e);
      setStartPoint(point);

      const handle = (e.target as SVGElement).dataset.handle;
      const elementId = (e.target as SVGElement).dataset.id;
      const segmentIndex = (e.target as SVGElement).dataset.segmentIndex;

      if (elementId && handle) {
        e.stopPropagation();
        const element = elements.find((el) => el.id === elementId);
        if (element?.locked) return;

        if (handle === "line-segment" && segmentIndex !== undefined) {
          setAction("line-segment-editing");
          setActionDetail({
            elementId,
            segmentIndex: parseInt(segmentIndex, 10),
          });
          return;
        }

        if (handle === "rotate") {
          setAction("rotating");
        } else if (handle === "line-start" || handle === "line-end") {
          setAction(
            handle === "line-start" ? "line-editing-start" : "line-editing-end"
          );
        } else {
          setAction("resizing");
        }
        setActionDetail({ handle, elementId });
        return;
      }

      if (currentTool === "text") {
        const newElement = createElement(
          nanoid(),
          point.x,
          point.y,
          point.x,
          point.y,
          "text",
          currentColor === (resolvedTheme === "dark" ? "#e2e8f0" : "#18181b")
            ? "default"
            : currentColor,
          strokeWidth
        );
        if (newElement) {
          setElements((prev) => [...prev, newElement], { addToHistory: true });
          setEditingState({ id: newElement.id });
          setLiveEditText("");
          // Reset tool to selection after creating text? Or keep it?
          // User requirements: "The user should be able to re-select... to edit".
          // Usually text tool stays active or switches to selection.
          // Let's switch to selection to avoid creating empty text boxes everywhere.
          setCurrentTool("selection");
        }
        return;
      }

      if (currentTool === "pan") {
        setAction("panning");
        return;
      }

      if (currentTool === "eraser") {
        setAction("erasing");
        const element = getElementAtPosition(point.x, point.y);
        if (element && !element.locked) {
          setElements((prev) => prev.filter((el) => el.id !== element.id), {
            addToHistory: true,
          });
        }
        return;
      }

      if (currentTool === "selection") {
        const element = getElementAtPosition(point.x, point.y);
        if (element) {
          const newSelectedIds = e.shiftKey
            ? new Set(selectedElementIds)
            : new Set<string>();

          if (element.groupId) {
            elements.forEach((el) => {
              if (el.groupId === element.groupId) newSelectedIds.add(el.id);
            });
          } else {
            if (newSelectedIds.has(element.id) && e.shiftKey)
              newSelectedIds.delete(element.id);
            else newSelectedIds.add(element.id);
          }
          setSelectedElementIds(newSelectedIds);
          if (!element.locked) {
            setAction("moving");
          }
        } else {
          setAction("selecting");
          setSelectionArea({
            x1: point.x,
            y1: point.y,
            x2: point.x,
            y2: point.y,
          });
          setSelectedElementIds(new Set());
        }
      } else {
        setSelectedElementIds(new Set());
        setAction("drawing");
        setShapePreview(null);

        let startDrawPoint = point;
        let startShapeId: string | undefined = undefined;
        let startConnPoint: ConnectionPointInfo | undefined = undefined;

        if (currentTool === "line" || currentTool === "arrow") {
          const snap = findSnapPoint(point);
          if (snap) {
            startDrawPoint = snap.connectionPoint.point;
            startShapeId = snap.shapeId;
            startConnPoint = snap.connectionPoint;
            setSnapPointInfo({
              ...snap.connectionPoint,
              shapeId: snap.shapeId,
            });
          }
        }

        const newElement = createElement(
          nanoid(),
          startDrawPoint.x,
          startDrawPoint.y,
          startDrawPoint.x,
          startDrawPoint.y,
          currentTool,
          currentColor === (resolvedTheme === "dark" ? "#e2e8f0" : "#18181b")
            ? "default"
            : currentColor,
          strokeWidth
        );
        if (!newElement) return;

        if (newElement.type === "line" && startShapeId) {
          newElement.startShapeId = startShapeId;
          (newElement as any).startConnPoint = startConnPoint; // Store temporary connection info
        }
        setDrawingElement(newElement);
      }
    },
    [
      action,
      currentTool,
      elements,
      selectedElementIds,
      setElements,
      getElementAtPosition,
      viewBox,
      zoom,
      currentColor,
      resolvedTheme,
      strokeWidth,
      findSnapPoint,
    ]
  );

  const throttledUpdateCursor = useCallback(
    throttle((point: Point) => {
      updateCursor(point);
    }, 16),
    [updateCursor]
  );

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const point = getPoint(e);
    throttledUpdateCursor(point);
    const dx = point.x - startPoint.x;
    const dy = point.y - startPoint.y;

    const isShapeTool = [
      "rectangle",
      "ellipse",
      "rectangle-rounded",
      "rectangle-dashed",
      "ellipse-dashed",
      "rectangle-rounded-dashed",
    ].includes(currentTool);
    if (action === "none" && isShapeTool) {
      const tool = currentTool as keyof typeof DEFAULT_SHAPE_SIZES;
      const size = DEFAULT_SHAPE_SIZES[tool];
      const newPreview = createElement(
        "preview",
        point.x,
        point.y,
        point.x + size.width,
        point.y + size.height,
        tool,
        currentColor,
        strokeWidth
      );
      setShapePreview(newPreview);
    } else if (shapePreview) {
      setShapePreview(null);
    }

    if (action === "erasing") {
      const element = getElementAtPosition(point.x, point.y);
      if (element && !element.locked) {
        setElements((prev) => prev.filter((el) => el.id !== element.id), {
          addToHistory: false,
        });
      }
      return;
    }

    if (action === "drawing" && drawingElement) {
      const newDrawingElement = { ...drawingElement };
      if (newDrawingElement.type === "pen") {
        newDrawingElement.points = [...newDrawingElement.points, point];
      } else if (
        newDrawingElement.type === "line" ||
        newDrawingElement.type === "shape"
      ) {
        let endPoint = point;
        if (newDrawingElement.type === "line") {
          const snap = findSnapPoint(point, newDrawingElement.startShapeId);
          setSnapPointInfo(
            snap ? { ...snap.connectionPoint, shapeId: snap.shapeId } : null
          );
          const startConnPoint = (drawingElement as any).startConnPoint;
          if (startConnPoint) {
            const endConnPoint: ConnectionPointInfo = snap
              ? snap.connectionPoint
              : { point, direction: "N" }; // Dummy direction
            newDrawingElement.points = calculateOrthogonalPath(
              startConnPoint,
              endConnPoint
            );
            endPoint =
              newDrawingElement.points[newDrawingElement.points.length - 1];
          }
        }
        newDrawingElement.x2 = endPoint.x;
        newDrawingElement.y2 = endPoint.y;
      }
      setDrawingElement(newDrawingElement);
    } else if (action === "moving" && selectedElementIds.size > 0) {
      moveElements(dx, dy, selectedElementIds);
      setStartPoint(point);
    } else if (
      (action === "line-editing-start" || action === "line-editing-end") &&
      actionDetail?.elementId
    ) {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (el.id === actionDetail.elementId && el.type === "line") {
              const newEl = { ...el };
              const isStart = action === "line-editing-start";

              // Detach if Shift is held
              if (e.shiftKey) {
                if (isStart) newEl.startBinding = undefined;
                else newEl.endBinding = undefined;

                if (isStart) {
                  newEl.x1 = point.x;
                  newEl.y1 = point.y;
                } else {
                  newEl.x2 = point.x;
                  newEl.y2 = point.y;
                }

                // Update points array if it exists
                if (newEl.points && newEl.points.length > 0) {
                  const newPoints = [...newEl.points];
                  if (isStart) newPoints[0] = { x: point.x, y: point.y };
                  else
                    newPoints[newPoints.length - 1] = {
                      x: point.x,
                      y: point.y,
                    };
                  newEl.points = newPoints;
                }
                return newEl;
              }

              // Find snap point
              const snap = findSnapPoint(point); // Don't exclude any shape for now, or maybe exclude self if needed
              setSnapPointInfo(
                snap ? { ...snap.connectionPoint, shapeId: snap.shapeId } : null
              );

              if (snap) {
                const { shapeId, connectionPoint } = snap;
                const shape = prev.find(
                  (e) => e.id === shapeId
                ) as ShapeElement;
                if (shape) {
                  const bounds = getElementBounds(shape);
                  const nearest = getNearestSide(connectionPoint.point, bounds);

                  const binding: ElementBinding = {
                    elementId: shapeId,
                    side: nearest.side,
                    sideOffset: nearest.offset,
                  };

                  if (isStart) {
                    newEl.startBinding = binding;
                    newEl.x1 = connectionPoint.point.x;
                    newEl.y1 = connectionPoint.point.y;
                  } else {
                    newEl.endBinding = binding;
                    newEl.x2 = connectionPoint.point.x;
                    newEl.y2 = connectionPoint.point.y;
                  }
                }
              } else {
                // Free movement
                if (isStart) {
                  newEl.startBinding = undefined;
                  newEl.x1 = point.x;
                  newEl.y1 = point.y;
                } else {
                  newEl.endBinding = undefined;
                  newEl.x2 = point.x;
                  newEl.y2 = point.y;
                }
              }

              // Update points array
              if (newEl.points && newEl.points.length > 0) {
                const newPoints = [...newEl.points];
                if (isStart) newPoints[0] = { x: newEl.x1, y: newEl.y1 };
                else
                  newPoints[newPoints.length - 1] = {
                    x: newEl.x2,
                    y: newEl.y2,
                  };
                newEl.points = newPoints;
              }

              return newEl;
            }
            return el;
          }),
        { addToHistory: false }
      );
    } else if (
      action === "line-segment-editing" &&
      actionDetail?.elementId &&
      actionDetail.segmentIndex !== undefined
    ) {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (
              el.id === actionDetail.elementId &&
              el.type === "line" &&
              el.points
            ) {
              const newEl = { ...el };
              const newPoints = [...(newEl.points || [])];
              const index = actionDetail.segmentIndex!;
              const p1 = newPoints[index];
              const p2 = newPoints[index + 1];

              if (p1.x === p2.x) {
                // Vertical segment
                newPoints[index] = { ...p1, x: point.x };
                newPoints[index + 1] = { ...p2, x: point.x };
              } else {
                // Horizontal segment
                newPoints[index] = { ...p1, y: point.y };
                newPoints[index + 1] = { ...p2, y: point.y };
              }
              newEl.points = newPoints;
              return newEl;
            }
            return el;
          }),
        { addToHistory: false }
      );
    } else if (action === "moving" && selectedElementIds.size > 0) {
      moveElements(dx, dy, selectedElementIds);
      setStartPoint(point);
    } else if (
      action === "resizing" &&
      actionDetail?.handle &&
      actionDetail?.elementId
    ) {
      setElements(
        (prev) => {
          const updatedElements = prev.map((el) => {
            if (
              el.id === actionDetail.elementId &&
              (el.type === "shape" || el.type === "line")
            ) {
              const newEl = { ...el };
              const handle = actionDetail.handle;
              if (handle?.includes("right")) newEl.x2 = point.x;
              if (handle?.includes("left")) newEl.x1 = point.x;
              if (handle?.includes("bottom")) newEl.y2 = point.y;
              if (handle?.includes("top")) newEl.y1 = point.y;
              return newEl;
            }
            return el;
          });

          // Update connected lines for resizing
          return updatedElements.map((el) => {
            if (el.type === "line") {
              const newEl = { ...el };
              let changed = false;

              if (
                newEl.startBinding &&
                newEl.startBinding.elementId === actionDetail.elementId
              ) {
                const shape = updatedElements.find(
                  (e) => e.id === newEl.startBinding!.elementId
                ) as ShapeElement;
                if (shape) {
                  const bounds = getElementBounds(shape);
                  const newPos = computeAttachmentPoint(
                    bounds,
                    newEl.startBinding.side,
                    newEl.startBinding.sideOffset
                  );
                  newEl.x1 = newPos.x;
                  newEl.y1 = newPos.y;
                  changed = true;
                }
              }
              if (
                newEl.endBinding &&
                newEl.endBinding.elementId === actionDetail.elementId
              ) {
                const shape = updatedElements.find(
                  (e) => e.id === newEl.endBinding!.elementId
                ) as ShapeElement;
                if (shape) {
                  const bounds = getElementBounds(shape);
                  const newPos = computeAttachmentPoint(
                    bounds,
                    newEl.endBinding.side,
                    newEl.endBinding.sideOffset
                  );
                  newEl.x2 = newPos.x;
                  newEl.y2 = newPos.y;
                  changed = true;
                }
              }

              if (changed && newEl.points && newEl.points.length > 0) {
                const newPoints = [...newEl.points];
                if (
                  newEl.startBinding &&
                  newEl.startBinding.elementId === actionDetail.elementId
                )
                  newPoints[0] = { x: newEl.x1, y: newEl.y1 };
                if (
                  newEl.endBinding &&
                  newEl.endBinding.elementId === actionDetail.elementId
                )
                  newPoints[newPoints.length - 1] = {
                    x: newEl.x2,
                    y: newEl.y2,
                  };
                newEl.points = newPoints;
              }
              return newEl;
            }
            return el;
          });
        },
        { addToHistory: false }
      );
    } else if (action === "rotating" && actionDetail?.elementId) {
      setElements(
        (prev) =>
          prev.map((el) => {
            if (el.id === actionDetail.elementId) {
              const bounds = getElementBounds(el);
              const centerX = bounds.x1 + (bounds.x2 - bounds.x1) / 2;
              const centerY = bounds.y1 + (bounds.y2 - bounds.y1) / 2;
              const angle =
                (Math.atan2(point.y - centerY, point.x - centerX) * 180) /
                  Math.PI +
                90;
              return { ...el, angle };
            }
            return el;
          }),
        { addToHistory: false }
      );
    } else if (action === "selecting" && selectionArea) {
      setSelectionArea({ ...selectionArea, x2: point.x, y2: point.y });
    } else if (action === "panning") {
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent default to stop scrolling while drawing
    if (e.target instanceof Element && e.target.closest("svg")) {
      // Only prevent default if we are interacting with the canvas
    }
    handleMouseDown(e as unknown as React.MouseEvent);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Prevent scrolling
    if (e.cancelable) e.preventDefault();
    handleMouseMove(e as unknown as React.MouseEvent<SVGSVGElement>);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleMouseUp(e as unknown as React.MouseEvent<SVGSVGElement>);
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (
      [
        "moving",
        "resizing",
        "rotating",
        "erasing",
        "line-editing-start",
        "line-editing-end",
        "line-segment-editing",
      ].includes(action)
    ) {
      setElements(elements, { addToHistory: true });
    }

    const point = getPoint(e);
    const dist = Math.sqrt(
      Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2)
    );

    if (action === "drawing" && drawingElement) {
      const finalElement = { ...drawingElement };

      const isShapeTool = [
        "rectangle",
        "ellipse",
        "rectangle-rounded",
        "rectangle-dashed",
        "ellipse-dashed",
        "rectangle-rounded-dashed",
      ].includes(currentTool);
      if (isShapeTool && dist < 5 && finalElement.type === "shape") {
        const tool = currentTool as keyof typeof DEFAULT_SHAPE_SIZES;
        const size = DEFAULT_SHAPE_SIZES[tool];
        finalElement.x2 = finalElement.x1 + size.width;
        finalElement.y2 = finalElement.y1 + size.height;
      }

      if (finalElement.type === "line") {
        const snap = findSnapPoint(point, finalElement.id);
        if (snap) {
          finalElement.endShapeId = snap.shapeId;
        }
      }

      const bounds = getElementBounds(finalElement);
      const isAcceptableSize =
        Math.abs(bounds.x1 - bounds.x2) > 5 ||
        Math.abs(bounds.y1 - bounds.y2) > 5 ||
        finalElement.type === "pen";

      let isConnectionValid = true;
      if (finalElement.type === "line") {
        if (finalElement.startShapeId && !finalElement.endShapeId) {
          isConnectionValid = false;
        }
      }

      if (isAcceptableSize && isConnectionValid) {
        setElements((prev) => [...prev, finalElement], { addToHistory: true });
      }
      setDrawingElement(null);

      if (currentTool !== "pen" && currentTool !== "selection") {
        setCurrentTool("selection");
      }
    }
    if (action === "selecting" && selectionArea) {
      const { x1, y1, x2, y2 } = selectionArea;
      const selMinX = Math.min(x1, x2);
      const selMinY = Math.min(y1, y2);
      const selMaxX = Math.max(x1, x2);
      const selMaxY = Math.max(y1, y2);

      const selectedIds = new Set<string>();
      elements
        .filter((el) => {
          const bounds = getElementBounds(el);
          return (
            bounds.x1 >= selMinX &&
            bounds.x2 <= selMaxX &&
            bounds.y1 >= selMinY &&
            bounds.y2 <= selMaxY
          );
        })
        .forEach((el) => selectedIds.add(el.id));
      setSelectedElementIds(selectedIds);
    }
    setSelectionArea(null);
    setSnapPointInfo(null);
    setAction("none");
    setActionDetail(null);
  };

  const updateShapeToFitText = (
    element: WhiteboardElement,
    text: string,
    fontSize: number = 16
  ) => {
    if (!textMeasureRef.current) return element;
    if (element.type !== "shape" && element.type !== "line") return element;

    const padding = 20;
    const lineHeight = 1.2;

    // Create a temporary span to measure text
    const span = document.createElement("span");
    span.style.font = `${fontSize}px sans-serif`;
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "pre"; // Preserve whitespace for measurement
    span.textContent = text;
    document.body.appendChild(span);

    const lines = text.split("\n");
    let maxWidth = 0;
    lines.forEach((line) => {
      span.textContent = line;
      maxWidth = Math.max(maxWidth, span.offsetWidth);
    });
    const totalHeight = lines.length * fontSize * lineHeight;

    document.body.removeChild(span);

    const minWidth = 100;
    const minHeight = 50;

    const newWidth = Math.max(minWidth, maxWidth + padding * 2);
    const newHeight = Math.max(minHeight, totalHeight + padding * 2);

    const centerX = element.x1 + (element.x2 - element.x1) / 2;
    const centerY = element.y1 + (element.y2 - element.y1) / 2;

    return {
      ...element,
      x1: centerX - newWidth / 2,
      y1: centerY - newHeight / 2,
      x2: centerX + newWidth / 2,
      y2: centerY + newHeight / 2,
    };
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = getPoint(e);
    const element = getElementAtPosition(point.x, point.y);
    if (element && (element.type === "shape" || element.type === "text")) {
      setEditingState({ id: element.id });
      setLiveEditText(element.text || "");
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, zoom * (1 + zoomFactor))
      );

      const point = getPoint(e);
      const newWidth = window.innerWidth / newZoom;
      const newHeight = window.innerHeight / newZoom;

      const newX = point.x - (point.x - viewBox.x) * (newWidth / viewBox.width);
      const newY =
        point.y - (point.y - viewBox.y) * (newHeight / viewBox.height);

      setViewBox({ x: newX, y: newY, width: newWidth, height: newHeight });
      setZoom(newZoom);
    } else {
      setViewBox((prev) => ({
        ...prev,
        x: prev.x + e.deltaX / zoom,
        y: prev.y + e.deltaY / zoom,
      }));
    }
  };

  const handleCenterView = () => {
    if (elements.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    elements.forEach((el) => {
      const bounds = getElementBounds(el);
      minX = Math.min(minX, bounds.x1);
      minY = Math.min(minY, bounds.y1);
      maxX = Math.max(maxX, bounds.x2);
      maxY = Math.max(maxY, bounds.y2);
    });

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const newZoom = Math.min(
      window.innerWidth / width,
      window.innerHeight / height,
      1
    );

    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width: window.innerWidth / newZoom,
      height: window.innerHeight / newZoom,
    });
    setZoom(newZoom);
  };

  const handleCenterOnCollaborator = (collaborator: any) => {
    if (!collaborator.cursor) return;
    const { x, y } = collaborator.cursor;
    const newWidth = viewBox.width;
    const newHeight = viewBox.height;
    setViewBox({
      x: x - newWidth / 2,
      y: y - newHeight / 2,
      width: newWidth,
      height: newHeight,
    });
  };

  const handleExport = async () => {
    if (!whiteboardRef.current) return;

    // Create a temporary SVG with proper sizing
    const svg = whiteboardRef.current;
    const bbox = svg.getBBox();
    const padding = 20;

    // Find bounds of all elements
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    elements.forEach((el) => {
      const bounds = getElementBounds(el);
      minX = Math.min(minX, bounds.x1);
      minY = Math.min(minY, bounds.y1);
      maxX = Math.max(maxX, bounds.x2);
      maxY = Math.max(maxY, bounds.y2);
    });

    // If no elements, use default bounds
    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const tempSvg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    tempSvg.setAttribute("width", width.toString());
    tempSvg.setAttribute("height", height.toString());
    tempSvg.setAttribute(
      "viewBox",
      `${minX - padding} ${minY - padding} ${width} ${height}`
    );
    tempSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Clone content
    Array.from(svg.children).forEach((child) => {
      // Skip UI elements like handles
      if (
        !(child as Element).classList.contains("ui-element") &&
        !(child as Element).tagName.toLowerCase().includes("cursor")
      ) {
        tempSvg.appendChild(child.cloneNode(true));
      }
    });

    const svgData = new XMLSerializer().serializeToString(tempSvg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${docName || "diagram"}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStrokeWidthChange = (width: number) => {
    setStrokeWidth(width);
    // If elements are selected, update their stroke width immediately
    if (selectedElementIds.size > 0) {
      setElements(
        (prev) =>
          prev.map((el) =>
            selectedElementIds.has(el.id) ? { ...el, strokeWidth: width } : el
          ),
        { addToHistory: false } // Don't add to history for every slider move
      );
    }
  };

  const handleStrokeWidthChangeEnd = (width: number) => {
    // Add to history when slider interaction ends
    if (selectedElementIds.size > 0) {
      setElements(
        (prev) =>
          prev.map((el) =>
            selectedElementIds.has(el.id) ? { ...el, strokeWidth: width } : el
          ),
        { addToHistory: true }
      );
    }
  };

  const updateTextElement = (
    id: string,
    updates: Partial<WhiteboardElement>
  ) => {
    setElements(
      (prev) =>
        prev.map((el) => {
          if (el.id === id && el.type === "text") {
            return { ...el, ...updates } as TextElement;
          }
          return el;
        }),
      { addToHistory: true }
    );
  };

  const selectedTextElement =
    selectedElementIds.size === 1
      ? elements.find(
          (el) => selectedElementIds.has(el.id) && el.type === "text"
        )
      : null;

  const getCanvasCursor = (theme: "light" | "dark") => {
    switch (currentTool) {
      case "pan":
        return action === "panning" ? "grabbing" : "grab";
      case "selection":
        return action === "moving" ? "move" : "default";
      case "eraser":
        // Use a custom SVG cursor for eraser
        const eraserColor = theme === "dark" ? "white" : "black";
        const eraserSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${eraserColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-8l2-2 5 5-2 2 4 4h2v4h-4l-2-2-5 5-2 2h-4z"/><path d="m14 7 3 3"/><path d="m10 11 3 3"/></svg>`;
        const eraserUrl = `data:image/svg+xml;base64,${btoa(eraserSvg)}`;
        return `url("${eraserUrl}") 0 24, auto`; // 0 24 is the hotspot (bottom-left)
      default:
        return "crosshair";
    }
  };

  // ... (rest of the component logic)

  // Render Loading State
  if (authLoading || (isLoadingDoc && !error)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  // Render Error State
  if (error || (!user && !isPublic)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {error || "Authentication Required"}
            </h1>
            <p className="text-muted-foreground">
              {error
                ? "We couldn't load the document you're looking for. It might have been deleted or you don't have permission to view it."
                : "Please log in to view this document."}
            </p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go Home
            </Button>
            {!user && (
              <Button onClick={() => router.push("/login")}>Log In</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-background text-foreground flex flex-col font-sans">
      <TopBar
        viewMode={viewMode}
        setViewMode={setViewMode}
        onShare={() => setIsShareModalOpen(true)}
        isChatOpen={isChatOpen}
        setIsChatOpen={setIsChatOpen}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        title={docName}
        saveStatus={saveStatus}
        collaborators={collaborators}
        ownerId={ownerId}
        isCallOpen={isCallOpen}
        onToggleCall={handleToggleCall}
        activeCallParticipants={activeCallParticipants}
      />

      {authError && !user && (
        <div className="bg-yellow-500/10 text-yellow-600 px-4 py-2 text-sm text-center">
          You are editing as a guest. Some features might be limited.
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onExport={handleExport}
        roomId={params.id as string}
        isOwner={isOwner}
        allowedEmails={allowedEmails}
        isPublic={isPublic}
        onUpdatePermissions={handleUpdatePermissions}
      />

      <div className="flex-1 relative overflow-hidden flex flex-row">
        {(viewMode === "canvas" || viewMode === "both") && (
          <div
            className={`relative h-full ${
              viewMode === "both" ? "border-r border-border" : "w-full"
            }`}
            style={{
              width: viewMode === "both" ? `${splitRatio * 100}%` : "100%",
            }}
          >
            <main
              className={`w-full h-full ${
                resolvedTheme === "dark" ? "dark" : ""
              }`}
              style={{
                cursor: getCanvasCursor(resolvedTheme as "light" | "dark"),
              }}
            >
              <Whiteboard
                ref={whiteboardRef}
                elements={elements}
                drawingElement={drawingElement}
                shapePreview={shapePreview}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onWheel={handleWheel}
                selectedElementIds={selectedElementIds}
                currentTool={currentTool}
                selectionArea={selectionArea}
                editingState={editingState}
                liveEditText={liveEditText}
                viewBox={viewBox}
                snapPointInfo={snapPointInfo}
                getShapeConnectionPoints={
                  getShapeConnectionPoints as (
                    element: ShapeElement
                  ) => ConnectionPointInfo[]
                }
                textMeasureRef={textMeasureRef}
                theme={resolvedTheme}
                onTextChange={(text) => setLiveEditText(text)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onEditMermaid={handleEditMermaid}
                onMermaidSizeChange={handleMermaidSizeChange}
              />
              {collaborators
                .filter((c) => c.id !== userId)
                .map((c) => (
                  <UserCursor key={c.id} collaborator={c} viewBox={viewBox} />
                ))}

              {selectedTextElement && !editingState && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-border p-2 rounded-lg shadow-xl flex items-center gap-2 z-50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Size</span>
                    <Input
                      type="number"
                      value={(selectedTextElement as TextElement).fontSize}
                      onChange={(e) =>
                        updateTextElement(selectedTextElement.id, {
                          fontSize: parseInt(e.target.value) || 16,
                        })
                      }
                      className="w-16 h-8 bg-background"
                    />
                  </div>
                  <div className="w-px h-6 bg-border mx-1" />
                  <ToggleGroup
                    type="single"
                    value={(selectedTextElement as TextElement).align}
                    onValueChange={(v) =>
                      v &&
                      updateTextElement(selectedTextElement.id, {
                        align: v as "left" | "center" | "right",
                      })
                    }
                    className="border rounded-md p-0.5"
                  >
                    <ToggleGroupItem
                      value="left"
                      size="sm"
                      aria-label="Left Align"
                    >
                      <AlignLeft size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="center"
                      size="sm"
                      aria-label="Center Align"
                    >
                      <AlignCenter size={16} />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="right"
                      size="sm"
                      aria-label="Right Align"
                    >
                      <AlignRight size={16} />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </main>

            <Toolbar
              currentTool={currentTool}
              setCurrentTool={setCurrentTool}
              position={toolbarPosition}
              setPosition={setToolbarPosition}
              currentColor={currentColor}
              setCurrentColor={setCurrentColor}
              currentStrokeWidth={strokeWidth}
              setCurrentStrokeWidth={setStrokeWidth}
              onStrokeWidthChangeEnd={(width) => {
                if (selectedElementIds.size > 0) {
                  setElements(
                    (prev) =>
                      prev.map((el) =>
                        selectedElementIds.has(el.id) &&
                        (el.type === "shape" ||
                          el.type === "line" ||
                          el.type === "pen")
                          ? { ...el, strokeWidth: width }
                          : el
                      ),
                    { addToHistory: true }
                  );
                }
              }}
            />

            <div className="absolute bottom-4 right-4 z-10">
              <ZoomControls
                zoom={zoom}
                setZoom={setZoomLevel}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                onFitToScreen={handleCenterView}
              />
            </div>

            <ChatPanel
              isOpen={isChatOpen}
              setIsOpen={setIsChatOpen}
              messages={geminiMessages}
              setMessages={setGeminiMessages}
              onGenerateDiagram={handleGenerateDiagram}
              teamMessages={teamMessages}
              onSendTeamMessage={sendTeamMessage}
            />
          </div>
        )}

        {viewMode === "both" && (
          <div
            className="w-1 h-full cursor-col-resize bg-border hover:bg-primary transition-colors z-50 flex-shrink-0"
            onMouseDown={() => setIsResizingSplit(true)}
          />
        )}

        {(viewMode === "document" || viewMode === "both") && (
          <div
            className={`h-full ${viewMode === "both" ? "" : "w-full"}`}
            style={{
              width:
                viewMode === "both" ? `${(1 - splitRatio) * 100}%` : "100%",
            }}
          >
            <DocumentPanel
              content={docContent}
              onContentChange={setDocContent}
            />
          </div>
        )}
      </div>

      <MermaidEditDialog
        isOpen={isMermaidDialogOpen}
        onClose={() => setIsMermaidDialogOpen(false)}
        initialCode={mermaidEditCode}
        onSave={handleSaveMermaid}
      />

      <Dialog
        open={isPromptDialogOpen}
        onOpenChange={(open) => {
          setIsPromptDialogOpen(open);
          if (!open) setCurrentTool("selection");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Diagram with AI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt">Describe your diagram</Label>
              <Textarea
                id="prompt"
                placeholder="e.g. A flowchart for a login process..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPromptDialogOpen(false);
                setCurrentTool("selection");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDiagram}
              disabled={isGeneratingDiagram}
            >
              {isGeneratingDiagram ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Call Floating Window */}
      {isCallOpen && callToken && (
        <CallFloatingWindow
          roomId={id}
          token={callToken}
          onLeave={() => {
            setIsCallOpen(false);
            setCallToken("");
            leaveCallRoom();
          }}
        />
      )}
    </div>
  );
};

export default App;
