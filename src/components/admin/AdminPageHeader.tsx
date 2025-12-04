import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  emoji?: string;
  gradient?: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  emoji,
  gradient = "from-primary to-primary/70",
  badge,
  actions,
  children
}: AdminPageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Main Header Card */}
      <div className={cn(
        "rounded-2xl p-6 mb-6",
        "bg-gradient-to-br from-card via-card to-muted/30",
        "border border-border/50 shadow-sm"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Icon Container */}
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br shadow-lg",
              gradient
            )}>
              <span className="text-2xl">{emoji || "📋"}</span>
            </div>
            
            {/* Title and Description */}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {title}
                </h1>
                {badge && (
                  <Badge variant={badge.variant || "secondary"} className="hidden sm:flex">
                    {badge.text}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {actions}
            </div>
          )}
        </div>

        {/* Additional Content */}
        {children && (
          <div className="mt-4 pt-4 border-t border-border/50">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// Stats Card Component for Dashboard-like layouts
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  emoji?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: string;
  onClick?: () => void;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  description,
  icon,
  emoji,
  trend,
  gradient = "from-blue-500/10 to-blue-600/5",
  onClick,
  className
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 transition-all duration-300",
        "bg-gradient-to-br border border-border/50",
        "hover:shadow-lg hover:scale-[1.02] hover:border-primary/30",
        onClick && "cursor-pointer",
        gradient,
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs font-medium",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              <span>{trend.isPositive ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {(icon || emoji) && (
          <div className="text-3xl">
            {emoji || icon}
          </div>
        )}
      </div>
    </div>
  );
}

// Quick Action Button
interface QuickActionProps {
  label: string;
  icon?: ReactNode;
  emoji?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  gradient?: string;
  className?: string;
}

export function AdminQuickAction({
  label,
  icon,
  emoji,
  onClick,
  variant = "outline",
  gradient,
  className
}: QuickActionProps) {
  return (
    <Button
      variant={variant}
      onClick={onClick}
      className={cn(
        "h-auto py-3 px-4 flex-col gap-1 hover:scale-105 transition-all",
        gradient && `bg-gradient-to-r ${gradient} text-white border-0 hover:opacity-90`,
        className
      )}
    >
      <span className="text-xl">{emoji || icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </Button>
  );
}

export default AdminPageHeader;
