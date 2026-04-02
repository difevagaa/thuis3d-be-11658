

## Plan: Depuración Completa del Código — Limpieza Segura

### Resumen
Limpieza de código muerto, archivos no usados, y correcciones menores de calidad sin alterar ninguna funcionalidad existente.

---

### Bloque 1: Eliminar archivos completamente no usados (0 imports)

| Archivo | Líneas | Razón |
|---------|--------|-------|
| `src/data/themePresets.ts` | 393 | No importado en ningún lado |
| `src/data/colorPalettes.ts` | 874 | No importado en ningún lado |
| `src/components/ChatWidget.tsx` | ~100 | No importado en ningún lado |
| `src/components/ClientChatWidget.tsx` | ~100 | No importado en ningún lado |
| `src/components/AdminSidebarMemo.tsx` | 10 | No importado en ningún lado |
| `src/components/BackInStockNotify.tsx` | ~60 | No importado en ningún lado |
| `src/components/ColorPreview3D.tsx` | ~30 | No importado en ningún lado |

**Total eliminado: ~1,567 líneas de código muerto**

### Bloque 2: Eliminar funciones no usadas en seoUtils.ts

Las siguientes funciones exportadas NO son importadas por ningún archivo:
- `validateSEOConfiguration` (líneas 780-868)
- `generateProductStructuredData` (líneas 873-898)
- `generateArticleStructuredData` (líneas 903-926)
- Tipos `MultilingualKeywordResult` y `MetaDescriptionResult` (no importados externamente)

**Reducción: ~150 líneas**

### Bloque 3: Eliminar 21 archivos .md de documentación innecesarios

Los archivos `AUDITORIA_COMPLETA.md`, `CAROUSEL_ROLE_TESTING.md`, `CODE_REVIEW_COHERENCE.md`, `DEPLOYMENT_GUIDE.md`, `EDITOR_OPTIONS_GUIDE.md`, `ENHANCED_PAGE_BUILDER_GUIDE.md`, `GUIA_EDITOR_PAGINAS.md`, `GUIA_SEO_GOOGLE.md`, `IMPLEMENTATION_*.md`, `LITHOPHANE_*.md`, `MEJORAS_PAGE_BUILDER.md`, `PAGE_BUILDER_DOCUMENTATION.md`, `RESUMEN_EJECUTIVO.md`, `SECURITY_SUMMARY.md`, `SEO_QUICK_START.md`, `SEO_SUMMARY.md`, `AUDITORIA_MOBILE_CHECKLIST.md` no son referenciados en el código. Son documentación de desarrollo que no se despliega ni usa. Se mantiene `README.md`.

### Bloque 4: Reemplazar console.log/error con logger

En `src/lib/sectionTesting.ts` hay 12 `console.log/error` directos que deberían usar el `logger` existente para consistencia. Mismo patrón en `src/hooks/useStockReservation.tsx` (12 console.error), `src/hooks/useLogoSettings.tsx`, `src/hooks/useMaterialColors.tsx`, `src/hooks/usePageBuilderTranslation.tsx`.

**Cambio: Reemplazar ~35 console.log/error → logger.error/logger.info**

### Bloque 5: Limpiar tipos `any` seguros

- `src/lib/paymentUtils.ts`: Reemplazar `[key: string]: any` y `const insertData: any` con tipos más específicos donde sea posible
- `src/lib/errorHandler.ts`: Mantener los cast `as any` ya que son necesarios para error genérico

### Verificación final
- TypeScript compila sin errores (ya verificado: `tsc --noEmit` = 0 errores)
- Ningún archivo eliminado es importado por otro archivo (verificado con grep exhaustivo)
- No se altera ninguna función, ruta, o componente visible
- El servidor de desarrollo funciona sin warnings nuevos

### Archivos a eliminar
7 archivos de componentes/datos + 21 archivos .md

### Archivos a modificar
- `src/lib/seoUtils.ts` — eliminar 3 funciones + 2 tipos no usados
- `src/lib/sectionTesting.ts` — console → logger
- `src/hooks/useStockReservation.tsx` — console → logger
- `src/hooks/useLogoSettings.tsx` — console → logger
- `src/hooks/useMaterialColors.tsx` — console → logger
- `src/hooks/usePageBuilderTranslation.tsx` — console → logger

