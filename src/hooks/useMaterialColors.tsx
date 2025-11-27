import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Material {
  id: string;
  name: string;
  description: string;
  cost: number;
}

interface Color {
  id: string;
  name: string;
  hex_code: string;
}

/**
 * Hook personalizado para manejar la relación entre materiales y colores
 * Filtra los colores disponibles según el material seleccionado
 */
export function useMaterialColors() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [allColors, setAllColors] = useState<Color[]>([]);
  const [availableColors, setAvailableColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar materiales y colores
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [materialsRes, colorsRes] = await Promise.all([
        supabase.from("materials").select("*").is("deleted_at", null).order("name"),
        supabase.from("colors").select("*").is("deleted_at", null).order("name")
      ]);

      if (materialsRes.error) throw materialsRes.error;
      if (colorsRes.error) throw colorsRes.error;

      setMaterials(materialsRes.data || []);
      setAllColors(colorsRes.data || []);
      setAvailableColors(colorsRes.data || []); // Por defecto, todos los colores están disponibles
    } catch (error) {
      console.error("Error loading materials and colors:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar colores según el material seleccionado O por producto
  const filterColorsByMaterial = async (materialId: string | null, productId?: string) => {
    if (!materialId && !productId) {
      setAvailableColors([]);
      return;
    }

    try {
      if (materialId) {
        // Filtrar por material
        const { data, error } = await supabase
          .from("material_colors")
          .select("color_id, colors(*)")
          .eq("material_id", materialId)
          .is("colors.deleted_at", null);

        if (error) throw error;

        if (data && data.length > 0) {
          const filteredColors = data
            .map(mc => mc.colors)
            .filter(color => color !== null) as Color[];
          setAvailableColors(filteredColors);
        } else {
          setAvailableColors(allColors);
        }
      } else if (productId) {
        // Filtrar por colores asignados al producto
        const { data, error } = await supabase
          .from("product_colors")
          .select("color_id, colors(*)")
          .eq("product_id", productId)
          .is("colors.deleted_at", null);

        if (error) throw error;

        if (data && data.length > 0) {
          const filteredColors = data
            .map(pc => pc.colors)
            .filter(color => color !== null) as Color[];
          setAvailableColors(filteredColors);
        } else {
          setAvailableColors(allColors);
        }
      }
    } catch (error) {
      console.error("Error filtering colors:", error);
      setAvailableColors(allColors);
    }
  };

  return {
    materials,
    allColors,
    availableColors,
    loading,
    filterColorsByMaterial,
    reloadData: loadData
  };
}
