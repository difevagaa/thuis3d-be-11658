import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { i18nToast } from "@/lib/i18nToast";
import { logger } from "@/lib/logger";

interface UserSearchSelectorProps {
  value: string;
  onValueChange: (userId: string) => void;
  label?: string;
  placeholder?: string;
  includePoints?: boolean;
  className?: string;
}

export default function UserSearchSelector({
  value,
  onValueChange,
  label = "Usuario",
  placeholder = "Buscar usuario...",
  includePoints = false,
  className
}: UserSearchSelectorProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      if (includePoints) {
        // Cargar usuarios con información de puntos
        const { data: pointsData, error: pointsError } = await supabase
          .from("loyalty_points")
          .select("user_id, points_balance, lifetime_points")
          .order("points_balance", { ascending: false })
          .limit(100);

        if (pointsError) throw pointsError;

        if (pointsData && pointsData.length > 0) {
          // Cargar información de perfiles para estos usuarios
          const userIds = pointsData.map(p => p.user_id);
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          if (profilesError) throw profilesError;

          // Combinar datos
          const usersWithPoints = pointsData.map(points => {
            const profile = profilesData?.find(p => p.id === points.user_id);
            return {
              id: points.user_id,
              full_name: profile?.full_name || 'Sin nombre',
              email: profile?.email || '',
              points_balance: points.points_balance,
              lifetime_points: points.lifetime_points
            };
          });

          setUsers(usersWithPoints);
        } else {
          // Si no hay datos de puntos, inicializar automáticamente
          logger.log("No se encontraron usuarios con puntos, cargando perfiles...");
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .order("full_name")
            .limit(100);

          if (profilesError) throw profilesError;

          // Mapear con puntos en 0 para todos
          setUsers(profilesData?.map(p => ({
            id: p.id,
            full_name: p.full_name || 'Sin nombre',
            email: p.email || '',
            points_balance: 0,
            lifetime_points: 0
          })) || []);
        }
      } else {
        // Cargar usuarios normales desde profiles
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .order("full_name")
          .limit(100);

        if (error) throw error;

        setUsers(data?.map(u => ({
          id: u.id,
          full_name: u.full_name || 'Sin nombre',
          email: u.email || ''
        })) || []);
      }
    } catch (error: unknown) {
      console.error("Error loading users:", error);
      i18nToast.error("error.usersLoadFailed");
    } finally {
      setLoading(false);
    }
  }, [includePoints]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search)
    );
  });

  const selectedUser = users.find(user => user.id === value);

  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUser ? (
              <span className="truncate">
                {selectedUser.full_name} ({selectedUser.email})
                {includePoints && selectedUser.points_balance !== undefined && (
                  <span className="ml-2 text-muted-foreground">
                    - {selectedUser.points_balance} pts
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Cargando usuarios..." : "No se encontraron usuarios"}
              </CommandEmpty>
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.id}
                    onSelect={() => {
                      onValueChange(user.id === value ? "" : user.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{user.full_name}</div>
                      <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                    </div>
                    {includePoints && user.points_balance !== undefined && (
                      <div className="ml-2 text-sm font-medium text-primary">
                        {user.points_balance} pts
                      </div>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
