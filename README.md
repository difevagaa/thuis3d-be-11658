# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0

---

## 🌐 Configuración de GitHub Pages y Cloudflare DNS

### Error 1001: Resolución DNS - Guía de Solución

Si estás experimentando un **Error 1001** (DNS resolution error) al intentar acceder a tu sitio web a través de Cloudflare, sigue esta guía paso a paso para solucionarlo.

#### 📋 Pre-requisitos

1. Acceso al panel de control de Cloudflare
2. Acceso a la configuración de GitHub Pages del repositorio
3. El dominio `thuis3d.be` registrado y gestionado en Cloudflare

---

### 🔧 Paso 1: Configurar GitHub Pages

1. Ve a tu repositorio en GitHub: `https://github.com/[tu-usuario]/[tu-repositorio]`
2. Haz clic en **Settings** (Configuración)
3. En el menú lateral, busca **Pages**
4. En **Source**, selecciona:
   - **Source**: GitHub Actions
   - Esto utilizará el workflow de despliegue automático configurado en `.github/workflows/deploy.yml`
5. En **Custom domain**, ingresa: `thuis3d.be`
6. Marca la casilla **Enforce HTTPS** (después de que el certificado SSL esté listo)

---

### 🔧 Paso 2: Configurar DNS en Cloudflare

#### Opción A: Configuración con CNAME (Recomendada para subdominios)

Para un subdominio como `www.thuis3d.be`:

| Tipo | Nombre | Contenido | Proxy status |
|------|--------|-----------|--------------|
| CNAME | www | [tu-usuario].github.io | Proxied (nube naranja) |

#### Opción B: Configuración con registros A (Recomendada para dominio raíz)

Para el dominio raíz `thuis3d.be`, añade los siguientes registros A apuntando a las IPs de GitHub Pages:

| Tipo | Nombre | Contenido | Proxy status |
|------|--------|-----------|--------------|
| A | @ | 185.199.108.153 | Proxied (nube naranja) |
| A | @ | 185.199.109.153 | Proxied (nube naranja) |
| A | @ | 185.199.110.153 | Proxied (nube naranja) |
| A | @ | 185.199.111.153 | Proxied (nube naranja) |

#### Opción C: Configuración combinada (Dominio raíz + www)

Para que ambos funcionen (`thuis3d.be` y `www.thuis3d.be`):

| Tipo | Nombre | Contenido | Proxy status |
|------|--------|-----------|--------------|
| A | @ | 185.199.108.153 | Proxied |
| A | @ | 185.199.109.153 | Proxied |
| A | @ | 185.199.110.153 | Proxied |
| A | @ | 185.199.111.153 | Proxied |
| CNAME | www | [tu-usuario].github.io | Proxied |

---

### 🔧 Paso 3: Configurar SSL/TLS en Cloudflare

1. En el panel de Cloudflare, ve a **SSL/TLS**
2. Selecciona el modo **Full** o **Full (strict)**
   - **Full**: Cloudflare → GitHub Pages con SSL
   - **Full (strict)**: Requiere certificado válido en el origen (GitHub lo proporciona)

> ⚠️ **No uses "Flexible"** ya que puede causar bucles de redirección.

---

### 🔧 Paso 4: Configurar reglas de página (opcional pero recomendado)

Para redirigir el tráfico de `www` al dominio raíz:

1. Ve a **Rules** → **Page Rules**
2. Crea una nueva regla:
   - **URL**: `www.thuis3d.be/*`
   - **Setting**: Forwarding URL (301 - Permanent Redirect)
   - **Destination**: `https://thuis3d.be/$1`

---

### 🔧 Paso 5: Verificar la configuración

1. **Verificar DNS**: Usa el comando:
   ```bash
   dig thuis3d.be +short
   ```
   Deberías ver las IPs de GitHub Pages o las IPs de Cloudflare (si proxy está activado).

2. **Verificar propagación DNS**: Visita [whatsmydns.net](https://www.whatsmydns.net/) e ingresa tu dominio para verificar la propagación global.

3. **Verificar GitHub Pages**: En la configuración de Pages de tu repositorio, deberías ver un mensaje verde que dice "Your site is published at..."

---

### ⏱️ Tiempos de espera

- **Cambios en DNS de Cloudflare**: Propagación inmediata a minutos
- **Verificación de dominio en GitHub**: Puede tomar hasta 24 horas
- **Generación de certificado SSL**: Puede tomar hasta 24 horas

---

### 🔍 Solución de problemas comunes

#### Error 1001 persiste después de configurar

1. **Verifica que el archivo CNAME existe** en la raíz del repositorio con el contenido `thuis3d.be`
2. **Espera la propagación DNS** (hasta 48 horas en casos extremos)
3. **Limpia la caché de Cloudflare**: Ve a **Caching** → **Configuration** → **Purge Everything**
4. **Desactiva temporalmente el proxy** de Cloudflare (nube gris) para verificar que DNS funciona

#### El sitio carga pero con errores de CSS/JS

1. Verifica que el `base` en `vite.config.ts` esté configurado correctamente
2. Asegúrate de que todos los assets usen rutas absolutas comenzando con `/`

#### Bucle de redirección (ERR_TOO_MANY_REDIRECTS)

1. Cambia el modo SSL/TLS a **Full** o **Full (strict)**
2. Verifica que no hay reglas de página contradictorias

---

### 📁 Archivos importantes para GitHub Pages

Este repositorio incluye los siguientes archivos configurados para GitHub Pages:

- **`CNAME`**: Contiene el dominio personalizado (`thuis3d.be`)
- **`.github/workflows/deploy.yml`**: Workflow de GitHub Actions para despliegue automático
- **`public/404.html`**: Página de error 404 que maneja el routing de SPA

---

## Sistema de Calibración 3D

### 📊 Calibración de la Calculadora 3D

El sistema incluye un módulo avanzado de calibración que permite ajustar las estimaciones de tiempo y material basándose en datos reales de tu laminador (Cura, PrusaSlicer, etc.).

#### ¿Por qué calibrar?

La calculadora 3D estima tiempos de impresión y uso de material mediante algoritmos matemáticos. Sin embargo, cada impresora, material y configuración pueden producir resultados ligeramente diferentes. La calibración permite que el sistema aprenda de tus impresiones reales para dar estimaciones más precisas.

#### Proceso de Calibración Correcto

1. **Seleccionar una pieza de prueba**
   - Usa un STL real que vayas a imprimir
   - Ideal: piezas entre 10-100g
   - Evita geometrías extremadamente complejas para empezar

2. **Laminar en tu slicer**
   - Usa Cura, PrusaSlicer, o tu laminador preferido
   - Configura altura de capa, infill, velocidades normales
   - **Anota el tiempo estimado** (ej: 1h 25min = 85 minutos)
   - **Anota el peso del filamento** (ej: 12.5g)
   - Guarda el archivo STL original

3. **Registrar en el sistema**
   - Panel Admin → Calibración
   - Sube el mismo STL que usaste en el laminador
   - El sistema lo analizará automáticamente
   - Ingresa los datos exactos del laminador
   - El sistema calculará factores de ajuste

#### Factores de Calibración

Los **factores ideales** están entre **0.95x-1.2x**:
- **Factor de Material**: Relación entre peso calculado vs real
  - 1.0x = Perfecto (calculado = real)
  - 0.95x-1.2x = Excelente (±20%)
  - 0.8x-1.5x = Aceptable (con advertencia)
  - <0.5x o >2.0x = Se rechaza (datos incorrectos)

- **Factor de Tiempo**: Relación entre tiempo calculado vs real
  - Mismos rangos que material

#### Validación del Sistema

El sistema valida automáticamente las calibraciones:
- ✅ **Acepta** factores entre 0.5x-2.0x
- ⚠️ **Advierte** si están fuera de 0.8x-1.5x (pero acepta)
- ❌ **Rechaza** factores extremos (<0.5x o >2.0x)

Si una calibración es rechazada:
1. Verifica que el STL sea exactamente el mismo
2. Confirma que los datos del laminador sean correctos
3. Revisa que la configuración coincida (altura, infill, etc.)

#### Algoritmo de Cálculo de Soportes

El sistema calcula soportes usando:
- **Área real bajo voladizo**: Detecta caras con ángulo >45°
- **Altura promedio**: 40% de la altura de la pieza
- **Densidad de estructura**: 10% (soportes tipo grid/tree)
- **Clamping máximo**: 35% del volumen de la pieza

Fórmula: `Volumen Soportes = Área Voladizo × Altura(40%) × Densidad(10%)`

#### Estado del Sistema

El administrador puede ver el estado de calibración en el panel:
- 🎯 **Óptimo**: Factores entre 0.95x-1.2x
- ⚠️ **Aceptable**: Factores entre 0.8x-1.5x
- ❌ **Requiere calibración**: Sin perfiles o factores fuera de rango

#### Recursos Externos Recomendados

- [Guía de calibración 3D Work Labs](https://www.3dwork.io/calibracion-impresora-3d/)
- [DHM Online - Calibración impresora 3D](https://www.dhm.online/calibrar-impresora-3d/)
- [Guía de soportes y voladizos FDM](https://all3dp.com/2/3d-printing-support-structures/)

---

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/57e87420-5c56-4a91-a41f-e22bd87955e0) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
