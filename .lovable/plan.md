

# Auditoria General y Rediseno del Sitio Web

## Problema Critico #1: Productos no cargan (BLOQUEA TODO)

**Causa raiz identificada:** La politica RLS `Roles_Admin_Manage` en la tabla `user_roles` hace un subquery a `user_roles` dentro de su propia politica, causando **recursion infinita**. Esto bloquea TODAS las queries que involucren roles de usuario, incluyendo la carga de productos.

```text
user_roles -> Policy "Roles_Admin_Manage" -> SELECT FROM user_roles -> Policy triggers again -> INFINITE LOOP
```

**Error en consola:** `"infinite recursion detected in policy for relation "user_roles""`

**Solucion:** Reemplazar la politica `Roles_Admin_Manage` con una que use la funcion `is_admin_or_superadmin()` (que es `SECURITY DEFINER` y bypassa RLS):

```sql
DROP POLICY "Roles_Admin_Manage" ON user_roles;
CREATE POLICY "Roles_Admin_Manage" ON user_roles
  FOR ALL TO authenticated
  USING (is_admin_or_superadmin(auth.uid()))
  WITH CHECK (is_admin_or_superadmin(auth.uid()));
```

Tambien la politica `Roles_Self_View` se mantiene para que usuarios vean sus propios roles.

---

## Problema #2: Textos hardcoded en espanol en Products.tsx

Lineas 84, 92, 105, 111, 121 tienen toasts en espanol sin usar `t()`. Se reemplazaran con claves de traduccion.

---

## Plan de Rediseno Estetico Completo

### Fase 1: Correccion de datos (Migracion DB)
1. Fix RLS recursion en `user_roles` - una sola migracion SQL
2. Verificar que productos cargan correctamente despues del fix

### Fase 2: Rediseno de paginas publicas

**Home (SectionRenderer):**
- Mejorar el fallback cuando no hay productos (mejor UI con ilustracion)
- Mejorar espaciado y tipografia del carousel de productos

**Products (/productos):**
- Modernizar grid de productos con hover effects mejorados
- Mejorar filtros con mejor UX (badges activos, contadores)
- Internacionalizar toasts hardcoded en espanol

**ProductCard:**
- Mejorar transiciones hover
- Mejor layout de precio y nombre

**ProductDetail:**
- Revisar layout responsive

**Layout (Header/Footer):**
- Mejorar transiciones de navegacion activa (indicador visual)
- Mejorar bottom nav mobile con indicador activo animado

### Fase 3: Rediseno de paginas admin

**AdminSidebar:**
- Verificar que todas las rutas funcionan
- Mejorar indicadores activos

**AdminDashboard:**
- Verificar que las estadisticas cargan correctamente

### Fase 4: Mejoras globales de UX
- Verificar que las paginas de usuario (Mi Cuenta, Pedidos, Mensajes, Facturas, Cotizaciones) funcionan
- Verificar flujo de pago completo
- Verificar blog y galeria

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| **Migracion SQL** | Fix RLS `user_roles` (recursion infinita) |
| `src/pages/Products.tsx` | Internacionalizar toasts, mejorar UI grid |
| `src/components/ProductCard.tsx` | Mejorar hover effects y layout |
| `src/components/Layout.tsx` | Mejorar indicadores de navegacion activa |
| `src/components/FeaturedProductsCarousel.tsx` | Mejorar fallback vacio |
| `src/components/page-builder/SectionRenderer.tsx` | Simplificar query de roles (usar has_role function) |
| `public/locales/[es|en|nl]/products.json` | Agregar claves faltantes para toasts |
| `src/index.css` | Ajustes finos de variables CSS para consistencia |

## Checklist de verificacion

- [ ] Productos cargan en Home (carousel)
- [ ] Productos cargan en /productos
- [ ] ProductDetail funciona al hacer click
- [ ] Filtros de productos funcionan (categoria, material, precio)
- [ ] Admin puede ver user_roles sin error
- [ ] Header responsive funciona en mobile/tablet/desktop
- [ ] Bottom navigation mobile funciona
- [ ] Paginas de usuario (Mi Cuenta) cargan correctamente
- [ ] Blog y Galeria cargan
- [ ] Carrito funciona
- [ ] Toasts aparecen en el idioma correcto
- [ ] Estilos consistentes en todas las paginas

