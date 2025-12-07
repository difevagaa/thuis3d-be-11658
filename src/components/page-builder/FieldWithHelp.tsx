import { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldWithHelpProps {
  label: string;
  help: string;
  children: ReactNode;
  required?: boolean;
}

export function FieldWithHelp({ label, help, children, required }: FieldWithHelpProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                type="button"
                className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{help}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  );
}

interface SwitchFieldWithHelpProps {
  label: string;
  help: string;
  children: ReactNode;
}

export function SwitchFieldWithHelp({ label, help, children }: SwitchFieldWithHelpProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Label>{label}</Label>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button 
                type="button"
                className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{help}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {children}
    </div>
  );
}
