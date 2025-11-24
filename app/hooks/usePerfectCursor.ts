import { useState, useLayoutEffect, useRef } from "react";
import { Point } from "@/types";

// Helper to get a point on a cubic Bezier curve
// t is between 0 and 1
// p0: start, p1: control 1, p2: control 2, p3: end
const getCubicBezierPoint = (
  t: number,
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point
): Point => {
  const k = 1 - t;
  return {
    x:
      k * k * k * p0.x +
      3 * k * k * t * p1.x +
      3 * k * t * t * p2.x +
      t * t * t * p3.x,
    y:
      k * k * k * p0.y +
      3 * k * k * t * p1.y +
      3 * k * t * t * p2.y +
      t * t * t * p3.y,
  };
};

export const usePerfectCursor = (targetPoint: Point): Point => {
  const [point, setPoint] = useState(targetPoint);
  const previousPoint = useRef(targetPoint);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startPointRef = useRef(targetPoint);
  // Control points for the curve
  const controlPointsRef = useRef<{ p1: Point; p2: Point } | null>(null);

  useLayoutEffect(() => {
    // If target hasn't changed significantly, don't animate
    if (
      targetPoint.x === previousPoint.current.x &&
      targetPoint.y === previousPoint.current.y
    ) {
      return;
    }

    startPointRef.current = point;
    startTimeRef.current = performance.now();
    previousPoint.current = targetPoint;

    // Calculate distance to determine duration
    const dx = targetPoint.x - startPointRef.current.x;
    const dy = targetPoint.y - startPointRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dynamic duration based on distance
    // Increased base duration for "very smooth" feel
    // Minimum 300ms, max 1000ms
    const duration = Math.min(Math.max(dist * 5, 300), 1000);

    // Generate random control points for the curve to add "disturbance"
    const midX = (startPointRef.current.x + targetPoint.x) / 2;
    const midY = (startPointRef.current.y + targetPoint.y) / 2;

    // Add randomness (disturbance)
    // Only add significant disturbance for larger movements to avoid jitter on small updates
    const isSmallMovement = dist < 50;
    const disturbance = isSmallMovement ? 0 : Math.min(dist * 0.1, 30);

    controlPointsRef.current = {
      p1: {
        x:
          startPointRef.current.x +
          dx * 0.3 +
          (Math.random() - 0.5) * disturbance,
        y:
          startPointRef.current.y +
          dy * 0.3 +
          (Math.random() - 0.5) * disturbance,
      },
      p2: {
        x:
          startPointRef.current.x +
          dx * 0.7 +
          (Math.random() - 0.5) * disturbance,
        y:
          startPointRef.current.y +
          dy * 0.7 +
          (Math.random() - 0.5) * disturbance,
      },
    };

    const animate = (time: number) => {
      if (!startTimeRef.current) return;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out Quartic (smoother than Cubic)
      const ease = 1 - Math.pow(1 - progress, 4);

      if (controlPointsRef.current) {
        const nextPoint = getCubicBezierPoint(
          ease,
          startPointRef.current,
          controlPointsRef.current.p1,
          controlPointsRef.current.p2,
          targetPoint
        );
        setPoint(nextPoint);
      }

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we land exactly on target
        setPoint(targetPoint);
      }
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [targetPoint]);

  return point;
};
