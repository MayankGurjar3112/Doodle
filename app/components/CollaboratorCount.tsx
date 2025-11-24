import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users } from "lucide-react";

interface CollaboratorCountProps {
  count: number;
  isSimulationOn: boolean;
  setIsSimulationOn: (value: React.SetStateAction<boolean>) => void;
}

export const CollaboratorCount: React.FC<CollaboratorCountProps> = ({
  count,
  isSimulationOn,
  setIsSimulationOn,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSimulationOn((prev) => !prev)}
            className={`gap-2 backdrop-blur-lg bg-card/70 ${
              isSimulationOn ? "opacity-100" : "opacity-50"
            }`}
          >
            <Users className="w-4 h-4" />
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-xs">
              {count}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {count} active collaborator{count === 1 ? "" : "s"}. Click to{" "}
            {isSimulationOn ? "disable" : "enable"} simulation.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
