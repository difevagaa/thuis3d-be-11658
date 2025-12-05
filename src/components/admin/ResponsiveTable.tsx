import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  render?: (value: any, row: any) => ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  keyField: string;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  mobileCardRender?: (row: any) => ReactNode;
}

export function ResponsiveTable({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No hay datos",
  loading = false,
  className,
  mobileCardRender
}: ResponsiveTableProps) {
  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th 
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((row) => (
              <tr 
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "hover:bg-muted/30 transition-colors",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td 
                    key={col.key}
                    className={cn("px-4 py-3 text-sm", col.className)}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "bg-card border rounded-lg p-4 shadow-sm",
              onRowClick && "cursor-pointer active:bg-muted/50"
            )}
          >
            {mobileCardRender ? (
              mobileCardRender(row)
            ) : (
              <div className="space-y-2">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {col.header}
                      </span>
                      <span className="text-sm">
                        {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple mobile-first card list for admin sections
interface AdminCardListProps {
  children: ReactNode;
  className?: string;
}

export function AdminCardList({ children, className }: AdminCardListProps) {
  return (
    <div className={cn("grid gap-3 md:gap-4", className)}>
      {children}
    </div>
  );
}

interface AdminCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function AdminCard({ children, onClick, className }: AdminCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-4 shadow-sm transition-all",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}
