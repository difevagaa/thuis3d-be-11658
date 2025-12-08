# 🚀 Guía de Deployment - Mejoras Page Builder

## 📋 Pre-requisitos

Antes de hacer el deployment, asegúrate de tener:

- ✅ Acceso a la base de datos de Supabase
- ✅ Acceso al repositorio en GitHub
- ✅ Node.js y npm instalados (para build local)
- ✅ Supabase CLI instalado (opcional, para testing local)

---

## 🔄 Pasos de Deployment

### 1. Merge del Pull Request

```bash
# En GitHub, revisar y aprobar el PR:
# https://github.com/difevagaa/thuis3d-be-11658/pull/[PR_NUMBER]

# O desde la terminal:
git checkout main
git pull origin main
git merge copilot/update-homepage-content
git push origin main
```

### 2. Aplicar la Migración de Base de Datos

La migración SQL añade las 14 secciones de ejemplo a la página de inicio.

#### Opción A: Deployment Automático (Recomendado)

Si tienes configurado Supabase con GitHub Actions, la migración se aplicará automáticamente al hacer merge a `main`.

#### Opción B: Manual via Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en "SQL Editor"
3. Copia el contenido de: `supabase/migrations/20251208000000_add_homepage_sample_content.sql`
4. Pega en el editor
5. Click "Run"
6. Verifica que se ejecutó sin errores

#### Opción C: Manual via Supabase CLI

```bash
# Desde la raíz del proyecto
cd supabase

# Aplicar migración
supabase db push

# O aplicar solo esta migración específica
supabase migration up --local 20251208000000_add_homepage_sample_content
```

### 3. Verificar la Migración

Ejecuta esta query para confirmar que las secciones se crearon:

```sql
-- Verificar que las secciones se crearon correctamente
SELECT 
  section_name, 
  section_type, 
  is_visible,
  display_order
FROM page_builder_sections pbs
JOIN page_builder_pages pbp ON pbs.page_id = pbp.id
WHERE pbp.page_key = 'home'
ORDER BY display_order;

-- Deberías ver 14 secciones (o más si ya existían otras)
```

### 4. Build y Deploy del Frontend

```bash
# Asegúrate de estar en la rama main actualizada
git checkout main
git pull origin main

# Instalar dependencias (si no lo has hecho)
npm install

# Build de producción
npm run build

# El build debería completarse sin errores
# Tiempo esperado: ~15-20 segundos
```

### 5. Deploy a Producción

Dependiendo de tu configuración de hosting:

#### GitHub Pages (si aplica)

```bash
# El GitHub Action debería deployar automáticamente
# Verifica el workflow en: .github/workflows/deploy.yml
```

#### Otro Hosting (Vercel, Netlify, etc.)

Sigue las instrucciones específicas de tu proveedor de hosting. Generalmente:

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# O push a main si tienes auto-deploy configurado
```

### 6. Verificación Post-Deployment

#### A. Verificar la Página de Inicio

1. Ve a `https://tu-dominio.com/`
2. Deberías ver las 14 nuevas secciones
3. Scroll por toda la página para verificar:
   - ✅ Hero banner se ve correctamente
   - ✅ Features grid muestra 6 características
   - ✅ Carrusel de productos funciona
   - ✅ Banners tienen imágenes de fondo
   - ✅ Testimonios se muestran
   - ✅ FAQ accordion abre/cierra
   - ✅ Newsletter tiene formulario
   - ✅ Social media tiene enlaces

#### B. Verificar Responsividad Móvil

1. Abre DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Prueba diferentes dispositivos:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - iPad Pro (1024px)
4. Verifica que los carruseles:
   - ✅ No se vean cortados
   - ✅ Muestran 1 item en móvil
   - ✅ Navegación funciona
   - ✅ No hay scroll horizontal

#### C. Verificar el Editor de Páginas

1. Ve a `/admin/page-builder`
2. Login con credenciales de admin
3. Verifica las nuevas funcionalidades:
   - ✅ Barra de búsqueda funciona
   - ✅ Botón "Filtros" abre panel
   - ✅ Se ven 10 tipos de carruseles con emojis
   - ✅ Click en cada tipo de carrusel lo añade correctamente
   - ✅ Contador de resultados se actualiza
   - ✅ Filtros activos muestran badges

#### D. Probar los 10 Tipos de Carruseles

En el editor, añade cada tipo y verifica:

1. **🎯 Clásico 3 Columnas**
   - Muestra 3 productos en desktop
   - Auto-play activo
   - Navegación lateral

2. **🌟 Exhibición Ancho Completo**
   - Ancho completo de la página
   - 4 productos en desktop
   - Cards elevadas

3. **⭐ Compacto Individual**
   - 1 producto a la vez
   - Efecto fade
   - Paginación centrada

4. **📦 Cuadrícula 6 Productos**
   - Vista de grid sin scroll
   - 3 columnas en desktop
   - Sin auto-play

5. **⚡ Scroll Rápido 5**
   - 5 productos visibles
   - Scroll cada 3 segundos
   - Diseño minimalista

6. **💎 Premium Centrado**
   - Efecto coverflow 3D
   - Producto central destacado
   - Gradientes en cards

7. **🎨 Minimalista 2 Columnas**
   - 2 productos con espacio amplio
   - Diseño limpio
   - Aspect ratio 2:3

8. **∞ Scroll Continuo**
   - Free mode activado
   - Sin paginación
   - Movimiento fluido

9. **🔄 Estilo Tarjeta Giratoria**
   - Efecto flip 3D
   - Animación al cambiar
   - Cards con tilt hover

10. **📱 Compacto Mobile-First**
    - 6 productos en desktop
    - 2 productos en móvil
    - Espaciado compacto

---

## ✅ Checklist Final de Deployment

Marca cada item cuando lo completes:

### Pre-Deployment
- [ ] PR revisado y aprobado
- [ ] Todas las pruebas pasaron
- [ ] Build local exitoso
- [ ] No hay errores de TypeScript

### Deployment
- [ ] Merge a main completado
- [ ] Migración SQL aplicada
- [ ] Frontend deployed
- [ ] Sin errores en logs

### Post-Deployment
- [ ] Página inicio carga correctamente
- [ ] 14 secciones visibles
- [ ] Carruseles funcionan en desktop
- [ ] Carruseles funcionan en móvil
- [ ] Editor de páginas accesible
- [ ] 10 tipos de carruseles disponibles
- [ ] Búsqueda y filtros funcionan
- [ ] Botones llevan a URLs correctas

### Testing de Usuario
- [ ] Probado en Chrome
- [ ] Probado en Firefox
- [ ] Probado en Safari
- [ ] Probado en móvil real
- [ ] Velocidad de carga aceptable
- [ ] No hay errores en consola

---

## 🔧 Troubleshooting

### Problema: La migración falla

**Síntomas**: Error al ejecutar la migración SQL

**Soluciones**:

1. Verifica que la página 'home' existe:
```sql
SELECT * FROM page_builder_pages WHERE page_key = 'home';
```

2. Si no existe, créala primero:
```sql
INSERT INTO page_builder_pages (page_key, page_name, description, is_enabled)
VALUES ('home', 'Inicio', 'Página principal del sitio', true);
```

3. Luego ejecuta la migración de nuevo

### Problema: Carruseles no se ven en móvil

**Síntomas**: Los carruseles se ven cortados o con overflow horizontal

**Soluciones**:

1. Limpia la caché del navegador (Ctrl+Shift+R)
2. Verifica que el archivo `AdvancedCarousel.tsx` está actualizado
3. Revisa que no hay CSS custom sobrescribiendo los estilos

### Problema: No aparecen los 10 tipos de carruseles

**Síntomas**: Solo aparece 1 tipo genérico en el sidebar

**Soluciones**:

1. Verifica que `productCarouselTemplates.ts` existe
2. Revisa que `PageBuilderSidebar.tsx` importa los templates
3. Limpia la caché de build:
```bash
rm -rf dist node_modules/.vite
npm run build
```

### Problema: Build falla

**Síntomas**: Errores de TypeScript o imports

**Soluciones**:

1. Elimina node_modules y reinstala:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Verifica que todas las dependencias están instaladas:
```bash
npm ci
```

3. Revisa que no hay errores de sintaxis:
```bash
npm run lint
```

### Problema: Filtros no funcionan

**Síntomas**: El componente de filtros no aparece o no funciona

**Soluciones**:

1. Verifica que `SectionSearchFilter.tsx` está importado
2. Revisa que el componente `Label` se importa de `@/components/ui/label`
3. Limpia la caché y rebuilds

---

## 📊 Monitoreo Post-Deployment

### Métricas a Vigilar

Durante las primeras 24-48 horas después del deployment:

1. **Performance**
   - Tiempo de carga de página inicio
   - Time to Interactive (TTI)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)

2. **Errores**
   - Errores de JavaScript en consola
   - Requests HTTP fallidos
   - Errores de base de datos

3. **Uso**
   - Pageviews de página inicio
   - Tiempo en página
   - Bounce rate
   - Click-through rate en botones

4. **Móvil**
   - % de usuarios móviles
   - Errores específicos de móvil
   - Performance en móvil

### Herramientas Recomendadas

- **Google Analytics**: Comportamiento de usuarios
- **Google Search Console**: Performance SEO
- **Lighthouse**: Auditoría de performance
- **Sentry** (si configurado): Error tracking
- **Supabase Dashboard**: Logs de base de datos

---

## 🎯 Rollback Plan

Si algo sale mal y necesitas revertir:

### Rollback Rápido (Frontend)

```bash
# Revertir el merge
git revert [COMMIT_HASH]
git push origin main

# O hacer checkout de versión anterior
git checkout [TAG_ANTERIOR]
git push origin main --force
```

### Rollback de Base de Datos

```sql
-- Eliminar las secciones añadidas
DELETE FROM page_builder_sections 
WHERE page_id = (
  SELECT id FROM page_builder_pages WHERE page_key = 'home'
)
AND created_at > '2024-12-08';  -- Ajusta la fecha según necesites

-- Verificar
SELECT COUNT(*) FROM page_builder_sections 
WHERE page_id = (SELECT id FROM page_builder_pages WHERE page_key = 'home');
```

---

## 📞 Soporte

Si encuentras problemas durante el deployment:

1. **Revisa los logs**:
   - Build logs en GitHub Actions
   - Application logs en hosting
   - Database logs en Supabase

2. **Revisa la documentación**:
   - `MEJORAS_PAGE_BUILDER.md` - Detalles técnicos
   - `RESUMEN_EJECUTIVO.md` - Overview general

3. **Debugging**:
   - Console del navegador (F12)
   - Network tab para requests fallidos
   - Supabase logs para queries

---

## ✅ Deployment Completado

Una vez que todo esté funcionando:

1. ✅ Marca esta PR como completada
2. ✅ Documenta en changelog
3. ✅ Notifica al equipo
4. ✅ Planifica próximas mejoras

**¡Felicidades! El deployment está completo.** 🎉

---

**Última actualización**: 8 de Diciembre 2024  
**Versión**: 2.0.0  
**Autor**: GitHub Copilot  
