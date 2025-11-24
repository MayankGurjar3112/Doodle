"use client";

import React, { useEffect, useState, useRef } from "react";
import { nanoid } from "nanoid";

interface MermaidRendererProps {
  code: string;
  id: string;
  width: number;
  height: number;
  onSizeChange?: (width: number, height: number) => void;
}

export const MermaidRenderer: React.FC<MermaidRendererProps> = ({
  code,
  id,
  width,
  height,
  onSizeChange,
}) => {
  const [svg, setSvg] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        const uniqueId = `mermaid-${id}-${nanoid(6)}`;
        const { svg } = await mermaid.render(uniqueId, code);
        setSvg(svg);

        // Extract dimensions from SVG
        const viewBoxMatch = svg.match(
          /viewBox="([\d\.-]+) ([\d\.-]+) ([\d\.-]+) ([\d\.-]+)"/
        );
        if (viewBoxMatch && onSizeChange) {
          const w = parseFloat(viewBoxMatch[3]);
          const h = parseFloat(viewBoxMatch[4]);
          if (!isNaN(w) && !isNaN(h)) {
            // Only update if significantly different to avoid loops
            if (Math.abs(w - width) > 1 || Math.abs(h - height) > 1) {
              onSizeChange(w, h);
            }
          }
        }
      } catch (error) {
        console.error("Failed to render mermaid diagram:", error);
        setSvg(
          `<div style="color: red; padding: 10px;">Failed to render diagram</div>`
        );
      }
    };

    renderDiagram();
  }, [code, id, width, height, onSizeChange]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
