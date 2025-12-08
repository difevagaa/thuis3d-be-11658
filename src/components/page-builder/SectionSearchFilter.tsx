/**
 * Enhanced Section Search and Filter Component
 * Advanced search and filtering capabilities for page builder sections
 */

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Search, 
  Filter, 
  X, 
  Eye, 
  EyeOff, 
  SortAsc, 
  SortDesc,
  Calendar,
  Tag
} from 'lucide-react';

interface SectionSearchFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: string;
  onFilterTypeChange: (type: string) => void;
  filterVisibility: boolean | 'all';
  onFilterVisibilityChange: (visibility: boolean | 'all') => void;
  sectionTypes: string[];
  sectionCount: Record<string, number>;
  totalCount: number;
  filteredCount: number;
}

export function SectionSearchFilter({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterVisibility,
  onFilterVisibilityChange,
  sectionTypes,
  sectionCount,
  totalCount,
  filteredCount
}: SectionSearchFilterProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'type' | 'updated'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const hasActiveFilters = searchQuery || filterType !== 'all' || filterVisibility !== 'all';

  const clearFilters = () => {
    onSearchChange('');
    onFilterTypeChange('all');
    onFilterVisibilityChange('all');
  };

  return (
    <div className="space-y-3 p-3 border-b bg-muted/30">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar secciones por nombre o tipo..."
          className="pl-9 pr-20 h-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2">
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant={hasActiveFilters ? 'default' : 'outline'} 
              size="sm" 
              className="h-8"
            >
              <Filter className="h-3 w-3 mr-1" />
              Filtros
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2 h-4 px-1 text-[10px]">
                  {[searchQuery, filterType !== 'all', filterVisibility !== 'all'].filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-3">Filtros Avanzados</h4>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Tipo de Sección
                </Label>
                <Select value={filterType} onValueChange={onFilterTypeChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todos los tipos ({totalCount})
                    </SelectItem>
                    {sectionTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type} ({sectionCount[type] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Visibility Filter */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Visibilidad
                </Label>
                <Select 
                  value={filterVisibility === 'all' ? 'all' : filterVisibility ? 'visible' : 'hidden'} 
                  onValueChange={(value) => {
                    if (value === 'all') onFilterVisibilityChange('all');
                    else if (value === 'visible') onFilterVisibilityChange(true);
                    else onFilterVisibilityChange(false);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="visible">
                      <span className="flex items-center gap-2">
                        <Eye className="h-3 w-3" /> Visibles
                      </span>
                    </SelectItem>
                    <SelectItem value="hidden">
                      <span className="flex items-center gap-2">
                        <EyeOff className="h-3 w-3" /> Ocultas
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                  Ordenar por
                </Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Orden en página</SelectItem>
                      <SelectItem value="name">Nombre</SelectItem>
                      <SelectItem value="type">Tipo</SelectItem>
                      <SelectItem value="updated">Última modificación</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full h-8"
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Results count */}
        <div className="flex-1 text-xs text-muted-foreground text-right">
          {filteredCount !== totalCount ? (
            <span>
              Mostrando {filteredCount} de {totalCount} secciones
            </span>
          ) : (
            <span>{totalCount} secciones en total</span>
          )}
        </div>

        {/* Clear all button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={clearFilters}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {searchQuery && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              <Search className="h-2 w-2 mr-1" />
              "{searchQuery}"
              <button
                onClick={() => onSearchChange('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}
          {filterType !== 'all' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              <Tag className="h-2 w-2 mr-1" />
              {filterType}
              <button
                onClick={() => onFilterTypeChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}
          {filterVisibility !== 'all' && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {filterVisibility ? <Eye className="h-2 w-2 mr-1" /> : <EyeOff className="h-2 w-2 mr-1" />}
              {filterVisibility ? 'Visibles' : 'Ocultas'}
              <button
                onClick={() => onFilterVisibilityChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-2 w-2" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// Missing Label component import
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}
