import { useState, useEffect } from "react";
import { Paintbrush, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "admin-sidebar-theme";

export interface SidebarTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  border: string;
  activeItem: string;
  activeText: string;
  hoverBg: string;
  sectionIconBg: string;
}

export const sidebarThemes: SidebarTheme[] = [
  {
    id: "default",
    name: "Clásico",
    bg: "hsl(0 0% 100%)",
    text: "hsl(0 0% 15%)",
    accent: "hsl(221 83% 53%)",
    border: "hsl(0 0% 90%)",
    activeItem: "hsl(221 83% 53%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(0 0% 96%)",
    sectionIconBg: "hsl(0 0% 96%)",
  },
  {
    id: "dark",
    name: "Oscuro",
    bg: "hsl(224 20% 14%)",
    text: "hsl(0 0% 92%)",
    accent: "hsl(217 91% 60%)",
    border: "hsl(224 20% 22%)",
    activeItem: "hsl(217 91% 60%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(224 20% 20%)",
    sectionIconBg: "hsl(224 20% 20%)",
  },
  {
    id: "midnight",
    name: "Medianoche",
    bg: "hsl(230 25% 10%)",
    text: "hsl(220 14% 80%)",
    accent: "hsl(250 80% 65%)",
    border: "hsl(230 20% 18%)",
    activeItem: "hsl(250 80% 65%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(230 20% 16%)",
    sectionIconBg: "hsl(230 20% 16%)",
  },
  {
    id: "ocean",
    name: "Océano",
    bg: "hsl(200 30% 12%)",
    text: "hsl(200 20% 85%)",
    accent: "hsl(190 80% 50%)",
    border: "hsl(200 25% 20%)",
    activeItem: "hsl(190 80% 50%)",
    activeText: "hsl(200 30% 8%)",
    hoverBg: "hsl(200 25% 18%)",
    sectionIconBg: "hsl(200 25% 18%)",
  },
  {
    id: "emerald",
    name: "Esmeralda",
    bg: "hsl(160 20% 10%)",
    text: "hsl(160 15% 85%)",
    accent: "hsl(160 84% 39%)",
    border: "hsl(160 15% 18%)",
    activeItem: "hsl(160 84% 39%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(160 15% 16%)",
    sectionIconBg: "hsl(160 15% 16%)",
  },
  {
    id: "rose",
    name: "Rosa",
    bg: "hsl(340 15% 12%)",
    text: "hsl(340 10% 85%)",
    accent: "hsl(340 82% 52%)",
    border: "hsl(340 12% 20%)",
    activeItem: "hsl(340 82% 52%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(340 12% 18%)",
    sectionIconBg: "hsl(340 12% 18%)",
  },
  {
    id: "warm",
    name: "Cálido",
    bg: "hsl(30 20% 96%)",
    text: "hsl(30 10% 20%)",
    accent: "hsl(25 95% 53%)",
    border: "hsl(30 15% 88%)",
    activeItem: "hsl(25 95% 53%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(30 15% 92%)",
    sectionIconBg: "hsl(30 15% 92%)",
  },
  {
    id: "slate",
    name: "Pizarra",
    bg: "hsl(215 20% 18%)",
    text: "hsl(215 15% 80%)",
    accent: "hsl(215 70% 55%)",
    border: "hsl(215 15% 26%)",
    activeItem: "hsl(215 70% 55%)",
    activeText: "hsl(0 0% 100%)",
    hoverBg: "hsl(215 15% 24%)",
    sectionIconBg: "hsl(215 15% 24%)",
  },
];

export function getStoredTheme(): SidebarTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return sidebarThemes.find((t) => t.id === parsed.id) || sidebarThemes[0];
    }
  } catch {}
  return sidebarThemes[0];
}

export function SidebarCustomizer({
  currentTheme,
  onThemeChange,
}: {
  currentTheme: SidebarTheme;
  onThemeChange: (theme: SidebarTheme) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectTheme = (theme: SidebarTheme) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: theme.id }));
    onThemeChange(theme);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 rounded-md"
          style={{ color: currentTheme.text }}
        >
          <Paintbrush className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-48 p-2 rounded-xl shadow-lg"
      >
        <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">
          Tema del sidebar
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {sidebarThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => selectTheme(theme)}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all",
                "hover:ring-2 hover:ring-primary/30",
                currentTheme.id === theme.id && "ring-2 ring-primary"
              )}
              style={{ background: theme.bg, color: theme.text }}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: theme.accent }}
              />
              <span className="truncate">{theme.name}</span>
              {currentTheme.id === theme.id && (
                <Check className="h-3 w-3 flex-shrink-0 ml-auto" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
