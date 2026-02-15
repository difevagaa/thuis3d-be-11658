# 📋 GUÍA: Ejecutar SQL y Sincronizar Tipos en Lovable

## 🎯 Proceso Completo: 3 Pasos

### **PASO 1: Ejecutar el SQL en Lovable Cloud**

1. **Abre tu proyecto en Lovable**
2. **Ve a la configuración del proyecto** (icono de engranaje ⚙️)
3. **Busca la opción "Run SQL" o "SQL Editor"** (puede estar en una sección de Database o Supabase)
4. **Copia TODO el contenido del archivo SQL** que te proporcionaré al final
5. **Pégalo en el editor SQL** de Lovable
6. **Haz clic en "Run" o "Ejecutar"**
7. **Verifica que no haya errores** - Deberías ver un mensaje de éxito indicando que las tablas se crearon

---

### **PASO 2: Sincronizar los Tipos TypeScript**

Después de ejecutar el SQL, necesitas que Lovable regenere los tipos TypeScript para que tu código reconozca las nuevas tablas.

#### **Opción A: Sincronización Automática (Recomendada)**
1. En Lovable, busca un botón que diga **"Sync Types"** o **"Regenerate Types"**
2. Usualmente está en:
   - La misma sección donde ejecutaste el SQL
   - O en la configuración de Database/Supabase
   - O en la barra superior del editor
3. Haz clic y espera unos segundos
4. Lovable regenerará automáticamente los tipos desde tu base de datos Supabase

#### **Opción B: Comando en Lovable (Si está disponible)**
Algunos proyectos tienen un comando tipo:
```bash
lovable sync-types
```
o
```bash
supabase gen types typescript
```

#### **Opción C: Forzar Regeneración**
Si no encuentras el botón:
1. Haz un pequeño cambio en cualquier archivo (añade un espacio)
2. Guarda el archivo
3. Lovable debería detectar que la base de datos cambió y regenerar los tipos automáticamente

---

### **PASO 3: Verificar que los Tipos Funcionan**

1. **Abre cualquier archivo TypeScript** en Lovable
2. **Intenta importar las nuevas tablas**:
   ```typescript
   import { Database } from '@/integrations/supabase/types';
   
   // Deberías ver autocompletado para las nuevas tablas:
   type StatusRule = Database['public']['Tables']['status_transition_rules']['Row'];
   type ContextualHelp = Database['public']['Tables']['contextual_help_messages']['Row'];
   ```
3. **Si ves autocompletado y no hay errores rojos** = ✅ Los tipos están sincronizados correctamente

---

## 🔍 ¿Dónde Encontrar las Opciones en Lovable?

### **Ubicaciones Comunes del SQL Editor:**
- 📍 **Settings → Database → Run SQL**
- 📍 **Supabase → SQL Editor**
- 📍 **Tools → Database → Execute SQL**
- 📍 **Sidebar izquierdo → Database icon → SQL**

### **Ubicaciones Comunes del Sync Types:**
- 📍 **Settings → Database → Sync Types**
- 📍 **Supabase → Regenerate Types**
- 📍 **Tools → Sync Database Types**
- 📍 **Comando en la barra superior: "Sync Types"**

---

## ⚠️ Troubleshooting - Problemas Comunes

### **Problema 1: "La tabla no existe"**
**Solución:** Asegúrate de haber ejecutado el SQL primero en Lovable Cloud, no localmente.

### **Problema 2: "Los tipos no se actualizan"**
**Solución:** 
1. Cierra y vuelve a abrir Lovable
2. O fuerza un rebuild haciendo un cambio y guardando
3. O busca "Clear Cache" en la configuración

### **Problema 3: "Error al ejecutar el SQL"**
**Solución:**
- Verifica que no haya caracteres especiales copiados incorrectamente
- Ejecuta el SQL en partes si es muy largo (primero CREATE TABLE, luego INSERT, etc.)
- Revisa que no existan ya las tablas (si las creaste antes, agrégale `DROP TABLE IF EXISTS` al inicio)

### **Problema 4: "TypeScript no reconoce las nuevas columnas"**
**Solución:**
- Espera unos segundos y reinicia el servidor de desarrollo
- Fuerza sync types manualmente
- Cierra y reabre Lovable

---

## 📦 Lo que Lovable Hará Automáticamente

Cuando sincronices los tipos, Lovable:

1. ✅ Se conectará a tu base de datos Supabase
2. ✅ Leerá el schema completo (tablas, columnas, tipos)
3. ✅ Generará tipos TypeScript en `src/integrations/supabase/types.ts`
4. ✅ Actualizará el cliente de Supabase para usar los nuevos tipos
5. ✅ Mostrará autocompletado en tu editor para las nuevas tablas

---

## 🎓 Ejemplo Completo de Flujo de Trabajo

```
1. Copias el SQL de este repositorio
   ↓
2. Vas a Lovable → Settings → Run SQL
   ↓
3. Pegas el SQL y das "Run"
   ↓
4. Ves mensaje: "✅ SQL ejecutado correctamente"
   ↓
5. Buscas botón "Sync Types" en la misma página
   ↓
6. Haces clic y esperas ~10 segundos
   ↓
7. Ves mensaje: "✅ Types synchronized"
   ↓
8. Abres src/integrations/supabase/types.ts
   ↓
9. Verificas que las nuevas tablas aparecen ahí
   ↓
10. ¡Listo! Ya puedes usar las tablas en tu código
```

---

## 🚀 Después de Sincronizar

Una vez sincronizados los tipos, este código funcionará automáticamente:

```typescript
// ✅ Los hooks funcionarán
const { helps } = useContextualHelp('orders');
const { checkTransition } = useStatusTransitionRules();

// ✅ Las queries a Supabase funcionarán
const { data } = await supabase
  .from('contextual_help_messages')
  .select('*')
  .eq('section', 'orders');

// ✅ Los componentes funcionarán
<SmartStatusDialog rule={rule} onOptionSelected={handleOption} />
<HelpSidebar helps={helps} sectionName="Pedidos" />
```

---

## 📞 ¿Sigues Teniendo Problemas?

Si después de seguir estos pasos aún tienes errores:

1. **Verifica los logs de Lovable** - Puede haber errores de sintaxis en el SQL
2. **Comprueba la consola del navegador** - Puede haber errores de permisos RLS
3. **Revisa que tu usuario de Supabase tenga permisos** de admin
4. **Contacta al soporte de Lovable** - Ellos pueden ver tu base de datos y ayudarte

---

**✨ Nota Final:** Este proceso de sincronización es necesario SOLO cuando:
- ✅ Creas nuevas tablas
- ✅ Añades/modificas columnas
- ✅ Cambias tipos de datos

No es necesario si solo:
- ❌ Insertas datos (INSERT)
- ❌ Actualizas registros (UPDATE)
- ❌ Modificas código JavaScript/TypeScript
