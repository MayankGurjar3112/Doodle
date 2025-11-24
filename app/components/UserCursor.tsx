import React from "react";
import { Collaborator } from "../../types";
import { usePerfectCursor } from "../hooks/usePerfectCursor";

interface UserCursorProps {
  collaborator: Collaborator;
  viewBox: { x: number; y: number; width: number; height: number };
}

const CursorIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill={color}
  >
    <path
      stroke="#000"
      strokeWidth="2"
      d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
    ></path>
  </svg>
);

export const UserCursor: React.FC<UserCursorProps> = ({
  collaborator,
  viewBox,
}) => {
  const scaleX = window.innerWidth / viewBox.width;
  const scaleY = window.innerHeight / viewBox.height;

  const animatedPoint = usePerfectCursor(collaborator.position);

  const onScreenX = (animatedPoint.x - viewBox.x) * scaleX;
  const onScreenY = (animatedPoint.y - viewBox.y) * scaleY;

  return (
    <div
      className="absolute z-[5] pointer-events-none"
      style={{
        left: `${onScreenX}px`,
        top: `${onScreenY}px`,
        transform: "translate(-2px, -2px)",
      }}
    >
      <CursorIcon color={collaborator.color} />
      <span
        className="absolute top-5 left-5 px-2 py-1 text-sm text-white rounded-md shadow-lg"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.name}
      </span>
    </div>
  );
};
