# Excel to Sky — Design Spec

**Fecha:** 2026-05-26
**Estado:** Brainstorming cerrado, pendiente revisión del usuario antes del plan de implementación.

---

## 1. Propósito

PWA que convierte un fichero Excel/CSV en un dashboard visual interactivo (stat cards gigantes, gráficas, mapas) y permite compartirlo con un link público desde cualquier dispositivo.

**Usuario objetivo:** alguien con datos en Excel que quiere visualizarlos rápido sin Power BI / Tableau / configurar nada. Cero login.

**Modelo de negocio:** monetización con Google AdSense (Auto Ads) al entrar en la web. Sin suscripciones, sin pago.

---

## 2. Alcance funcional

### 2.1 Pantallas (6)

1. **Subida** — landing con CTA "Sube tu Excel". Drag & drop o file picker. 3 datasets de ejemplo (Personas / Viajes / Ventas) para probar sin subir nada.
2. **Dashboard** — vista principal tras parsear. Stat cards MAX / MIN / MODA / MEDIA por columna numérica + timelines (fechas) + mapas (datos geo) + tabla resumen.
3. **Detalle columna** — al hacer click en una columna, vista expandida: distribución, top valores, outliers, override de tipo detectado.
4. **Comparativas** — comparar 2 columnas (scatter, correlación, agrupado por categórica).
5. **Compartir** — modal que muestra el link público + botón copiar + QR.
6. **Vista pública** — el receptor del link ve el dashboard en modo solo-lectura, sin botones de edición.

### 2.2 Detección automática de tipos

Heurística por muestreo (100 primeras filas + 100 aleatorias del resto). Tipos soportados, en orden de prioridad:

1. Booleano (sí/no, true/false, 0/1)
2. Fecha (ISO, `dd/mm/yyyy`, `dd-mm-yyyy`, timestamps)
3. Numérico (entero, decimal, moneda — locale ES por defecto: `1.234,56`)
4. Geo (lat/lng en columnas pareadas, nombres de ciudad/país)
5. Categórico (cardinalidad < 5% y > 20 filas)
6. Texto libre (fallback)

**Umbral:** ≥80% de la muestra debe encajar para asignar el tipo. Si no, texto libre.

**Override manual:** dropdown en cabecera de columna permite cambiar el tipo si la heurística falla.

---

## 3. Arquitectura técnica

### 3.1 Stack

- **Frontend:** Vite + React 18 + TypeScript. SPA.
- **Estilos:** Tailwind (consistente con el prototipo de Claude Design en `app/`).
- **Parsing:** SheetJS Community Edition, ejecutado en Web Worker.
- **Persistencia local:** `idb` (~5 KB) sobre IndexedDB.
- **Backend:** Supabase (Postgres + Edge Functions Deno).
- **Hosting:** VPS Hostinger del usuario, nginx + Certbot.
- **PWA:** manifest.webmanifest + iconos (sin service worker en v1 para no interferir con AdSense).
- **Monetización:** Google AdSense Auto Ads.

### 3.2 Flujo de subida

```
Usuario click "Subir Excel"
  → file picker (.xlsx, .xls, .csv, .ods)
  → validación tamaño cliente (≤10 MB)
  → Web Worker parsea con SheetJS
  → Worker devuelve {columnas, tipos detectados, filas}
  → UI renderiza dashboard con sample data primero (preview rápido)
  → Botón "Compartir" → POST a Edge Function /create
  → Edge Function valida + rate-limit + inserta en Supabase
  → Devuelve {slug, deleteToken}
  → Frontend guarda {slug, nombre, deleteToken, createdAt} en IndexedDB local
  → Muestra link público
```

### 3.3 Schema Supabase

```sql
create table dashboards (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  data            jsonb not null,
  delete_token    text not null,
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  view_count      int not null default 0,
  expires_at      timestamptz not null default now() + interval '90 days'
);

create index idx_dashboards_slug on dashboards(slug);
create index idx_dashboards_expires_at on dashboards(expires_at);

create table rate_limits (
  ip            text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (ip, window_start)
);
```

**RLS:**
- `dashboards`: SELECT bloqueado para cliente; acceso público SOLO vía RPC `view_dashboard(slug)` (security definer).
- `dashboards`: INSERT / UPDATE / DELETE bloqueado desde cliente; solo vía Edge Function con `service_role` key.
- `rate_limits`: todo bloqueado para cliente; uso interno desde Edge Function.

**RPC `view_dashboard(slug text)`:** función `security definer` que devuelve la fila del dashboard, incrementa `view_count` y extiende `expires_at = now() + 90 days`. Es el único punto de lectura desde el frontend.

**Cron (pg_cron):** diario, borra `where expires_at < now()`.

### 3.4 Edge Functions (Deno)

- `POST /create`
  - Body: `{ name, data }` (data ≤5MB JSON).
  - Rate-limit por IP: máx 10 inserts/hora (tabla auxiliar `rate_limits(ip, count, window_start)`).
  - Genera `slug` (nanoid 12 chars) y `deleteToken` (nanoid 32 chars).
  - Inserta y devuelve `{slug, deleteToken}`.
- `POST /delete`
  - Body: `{ slug, deleteToken }`.
  - Verifica match y borra.
- Lectura: cliente llama `supabase.rpc('view_dashboard', { slug })` con la `anon key`. No expone la tabla directamente.

### 3.5 IndexedDB local

Schema (`idb`):
```
db: 'exceltosky' v1
  object store: 'dashboards'
    keyPath: 'slug'
    fields: { slug, name, deleteToken, createdAt, lastOpenedAt, owner: 'created'|'visited' }
```

UI en la home:
- Sección "Creados por ti" (`owner = 'created'`).
- Sección "Vistos recientemente" (`owner = 'visited'`).
- Botón "borrar de mi lista" → elimina entrada local, NO el dashboard remoto (para borrar de Supabase hace falta `deleteToken`, también local).

---

## 4. Monetización (AdSense)

- **Auto Ads** activado a nivel de cuenta AdSense → un único script `<script async src="...adsbygoogle.js?client=ca-pub-XXX">` en `<head>`.
- Google decide qué formatos mostrar (banner, in-feed, vignette/interstitial entre clicks).
- **Sin gating**: ningún anuncio bloquea la subida ni el dashboard.

**Requisitos para aprobación de AdSense:**
- Dominio propio (cubierto: Hostinger).
- Contenido real: landing con explicación, ejemplos, FAQ, posts del blog (al menos 5–10 páginas indexables).
- Política de privacidad + términos de uso.
- CMP certificada (Google Consent Mode v2) para tráfico EU.

**Plan B mientras AdSense aprueba** (puede tardar semanas): Adsterra como red provisional, mismo hueco de script, se cambia luego.

---

## 5. Estructura de carpetas propuesta

```
exceltosky/
├── app/                       # prototipo actual (se migra a src/)
├── src/
│   ├── components/            # UI atomic (StatCard, ChartLine, ColumnDetail, etc.)
│   ├── pages/                 # Subida, Dashboard, DetalleColumna, Comparativas, Compartir, VistaPublica
│   ├── lib/
│   │   ├── supabase.ts        # cliente Supabase con anon key
│   │   ├── localDb.ts         # wrapper sobre idb
│   │   ├── typeDetection.ts   # heurística de tipos
│   │   └── shareApi.ts        # cliente para Edge Functions
│   ├── workers/
│   │   └── parser.worker.ts   # parsing SheetJS aislado
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/            # SQL versionado
│   └── functions/
│       ├── create/index.ts
│       └── delete/index.ts
├── public/
│   ├── manifest.webmanifest
│   ├── icons/
│   └── robots.txt
├── docs/
│   └── superpowers/specs/     # este documento y futuros
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 6. Decisiones cerradas (resumen)

| Tema | Decisión |
|------|----------|
| Stack | Vite + React 18 + TypeScript + Tailwind |
| Backend | Supabase (DB + Edge Functions) |
| Hosting | VPS Hostinger + nginx + Certbot |
| Parsing | SheetJS Community + Web Worker, límite 10 MB |
| Auto-detección de tipos | Heurística por muestreo, locale ES, override manual |
| Compartir | Link secreto (slug nanoid 12), sin login |
| Permisos | Público con link; borrado vía deleteToken local |
| Persistencia local | IndexedDB con `idb`, índice "mis dashboards" |
| PWA | Solo manifest (sin service worker en v1) |
| Monetización | Google AdSense Auto Ads, sin gating |
| TTL dashboards | 90 días, se renueva al visitar; cron diario borra caducados |
| Rate-limit anti-abuso | 10 inserts/hora por IP en Edge Function `/create` |

---

## 7. Fuera de alcance (v1)

- Login / cuentas de usuario.
- Edición colaborativa en tiempo real.
- Service worker / offline para dashboards visitados.
- Exportar dashboard a PNG / PDF.
- Embebido en webs externas (iframe).
- Soporte móvil dedicado (desktop-first; móvil funcional pero no optimizado).
- Integraciones con Google Sheets / Notion / Airtable.
- Personalización de colores / temas por dashboard.

Cualquiera de estos puede entrar en v2 como sub-proyecto independiente con su propia spec.

---

## 8. Riesgos identificados

1. **Aprobación de AdSense puede tardar semanas o ser denegada.** Mitigación: lanzar con Adsterra y migrar después.
2. **Adblockers reducen ingresos ~30–40%.** Aceptado, no se mitiga (no se bloquea uso).
3. **Excel mal formados** (celdas combinadas, múltiples hojas, fórmulas) pueden romper el parser. Mitigación: try/catch en el worker, mensaje claro al usuario, ofrecer ejemplo de "Excel limpio".
4. **Abuso de inserts** pese al rate-limit (IPs rotativas). Mitigación: cuotas de Supabase free tier sirven de cortafuegos económico; si llega a producción seria, añadir hCaptcha en el endpoint `/create`.
5. **Free tier de Supabase se queda corto** si crece el uso. Plan Pro $25/mes cubre escenarios de miles de dashboards activos.
