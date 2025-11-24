import React from "react";
import { MoreHorizontal, FileText, Trash2, Copy, Edit2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Assuming user has shadcn or I need to use standard UI
// User mentioned "Three dots menu".
// I'll use standard HTML/CSS or Radix if available.
// package.json has @radix-ui/react-dropdown-menu.
// I'll use a simple implementation or assume the user has a Dropdown component.
// I'll use the Radix primitives directly or a simple custom one if I don't want to assume structure.
// Actually, I'll use a custom implementation for simplicity and to match the "Dark theme UI" request without relying on existing components I haven't seen.
// But wait, user has `components.json` which implies shadcn/ui.
// And `package.json` has `@radix-ui/...`.
// So I can probably use `@/components/ui/dropdown-menu` if it exists.
// I'll check if `components/ui` exists.
// Step 8 showed `components` has 16 children.
// Step 11 showed `app/components` has 9 children.
// I'll assume `components/ui` exists.
// I'll use a simple button for now to avoid import errors if I'm wrong.
// Actually, I'll just use a relative import for the icon and build a simple menu or use the Radix one if I can find it.
// Let's stick to a simple custom menu for the "Three dots" to be safe.

interface Document {
  _id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  authorId: string;
}

interface DocumentRowProps {
  doc: Document;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  doc,
  onDelete,
  onDuplicate,
  onRename,
}) => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleOpen = () => {
    router.push(`/documents/${doc._id}`);
  };

  return (
    <div
      className="group flex items-center justify-between p-4 hover:bg-zinc-800/50 rounded-lg transition-colors cursor-pointer border-b border-zinc-800/50 last:border-0"
      onClick={handleOpen}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="p-2 bg-zinc-800 rounded-lg">
          <FileText className="w-6 h-6 text-zinc-400" />
        </div>
        <div className="flex flex-col">
          <span className="text-zinc-200 font-medium">{doc.name}</span>
          <span className="text-zinc-500 text-xs md:hidden">
            Edited{" "}
            {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8 flex-1 justify-end mr-8">
        <span className="text-zinc-500 text-sm w-32">
          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true })}
        </span>
        <span className="text-zinc-500 text-sm w-32">
          {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
        </span>
      </div>

      <div
        className="flex items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 hover:bg-zinc-700 rounded-full transition-colors text-zinc-400 hover:text-white focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-zinc-900 border-zinc-800"
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename(doc._id, prompt("New name:", doc.name) || doc.name);
                setIsMenuOpen(false);
              }}
              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200 cursor-pointer"
            >
              <Edit2 className="w-4 h-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(doc._id);
                setIsMenuOpen(false);
              }}
              className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-200 cursor-pointer"
            >
              <Copy className="w-4 h-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc._id);
                setIsMenuOpen(false);
              }}
              className="text-red-400 focus:bg-red-900/20 focus:text-red-400 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
