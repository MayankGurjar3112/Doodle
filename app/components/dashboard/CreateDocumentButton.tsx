import React from "react";
import { Plus } from "lucide-react";

interface CreateDocumentButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const CreateDocumentButton: React.FC<CreateDocumentButtonProps> = ({
  onClick,
  disabled,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-64 h-40 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="w-12 h-12 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-zinc-500 transition-colors">
        <Plus className="w-6 h-6 text-zinc-400 group-hover:text-zinc-200" />
      </div>
      <span className="text-zinc-400 font-medium group-hover:text-zinc-200">
        Create a Blank File
      </span>
    </button>
  );
};
