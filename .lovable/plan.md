

# Plan: Corregir creacion de facturas para todos los usuarios + Guia para crear tablas desde GitHub

## Problema 1: Las facturas no se crean para usuarios sin rol admin

**Causa raiz identificada:** La tabla `invoices` tiene politicas RLS que solo permiten INSERT a usuarios con rol `admin` o `superadmin`. No existe ninguna politica que permita a un usuario autenticado normal insertar su propia factura.

Politicas actuales:
- `Admin full access to invoices` - Solo admins (ALL operations)
- `Admins can manage all invoices` - Solo admins (ALL operations)  
- `Anyone can view invoices` - Solo SELECT para ver las propias

**Falta:** Una politica INSERT para usuarios autenticados que les permita crear facturas donde `user_id = auth.uid()`.

### Solucion

Crear una nueva politica RLS en la tabla `invoices`:

```sql
CREATE POLICY "Users can create own invoices"
ON public.invoices
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
```

Esto permitira que cualquier usuario registrado cree facturas automaticamente al completar un pedido, sin importar su rol.

---

## Problema 2: Error de compilacion en MyAccount.tsx

La consulta en `MyAccount.tsx` intenta hacer un join entre `loyalty_redemptions.coupon_code` y la tabla `coupons`, pero no existe una clave foranea entre estas tablas. Esto causa el error TypeScript.

### Solucion

Modificar la consulta en `src/pages/user/MyAccount.tsx` (linea 158) para eliminar el join invalido con `coupons` y acceder a los datos del cupon de forma separada, o simplemente quitar las propiedades que no existen del mapeo en las lineas 178-179.

Se cambiara el select para no intentar el join con coupons via `coupon_code`, y se usaran valores por defecto en el mapeo.

---

## Problema 3: Como crear tablas desde GitHub Copilot

### Seccion informativa

Lovable Cloud gestiona la base de datos de forma integrada. Las migraciones SQL que un agente como GitHub Copilot cree en la carpeta `supabase/migrations/` **no se ejecutan automaticamente** porque Lovable Cloud tiene su propio sistema de migraciones.

**Para que GitHub Copilot pueda crear tablas, tienes dos opciones:**

### Opcion A: Usar Lovable para las migraciones
1. Pide a GitHub Copilot que genere el codigo de la aplicacion (componentes, paginas, logica).
2. Para los cambios de base de datos (nuevas tablas, columnas, politicas RLS), pide a Lovable que los ejecute.
3. Este es el flujo mas seguro y recomendado.

### Opcion B: Ejecutar SQL manualmente
1. GitHub Copilot puede generar los archivos SQL de migracion.
2. Tu copias ese SQL y lo ejecutas manualmente desde **Lovable Cloud > Run SQL** (accesible desde la configuracion del proyecto).
3. Despues sincronizas los tipos con Lovable para que el codigo reconozca las nuevas tablas.

**Importante:** Los archivos `.sql` en `supabase/migrations/` son solo referencia historica en este proyecto. La base de datos real se modifica unicamente a traves de Lovable Cloud o ejecutando SQL directamente.

---

## Resumen de cambios a implementar

| Cambio | Tipo | Archivo/Recurso |
|--------|------|-----------------|
| Nueva politica RLS INSERT en `invoices` | Migracion SQL | Base de datos |
| Corregir query de `loyalty_redemptions` | Codigo | `src/pages/user/MyAccount.tsx` |

## Lista de verificacion post-implementacion

- [ ] Crear un pedido como usuario sin rol admin y verificar que la factura se genera
- [ ] Crear un pedido como usuario admin y verificar que sigue funcionando
- [ ] Verificar que la pagina "Mi Cuenta" carga sin errores de consola
- [ ] Verificar que los cupones de lealtad se muestran correctamente
- [ ] Confirmar que las facturas aparecen en "Mis Facturas" del usuario

