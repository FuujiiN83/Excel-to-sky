# Deploy a VPS Hostinger

## Primera vez

1. **SSH al VPS** y prepara dependencias:
   ```bash
   apt update && apt install -y nginx certbot python3-certbot-nginx rsync
   ```

2. **DNS** — apunta el A record de `exceltosky.example` (o tu dominio) a la IP del VPS.

3. **Crear estructura**:
   ```bash
   mkdir -p /var/www/exceltosky/dist
   chown -R www-data:www-data /var/www/exceltosky
   ```

4. **Copiar nginx.conf**:
   ```bash
   scp deploy/nginx.conf user@vps:/etc/nginx/sites-available/exceltosky
   ssh user@vps "ln -s /etc/nginx/sites-available/exceltosky /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
   ```
   Antes edita `server_name` y las rutas SSL para tu dominio real.

5. **Certificado TLS** (Certbot lo genera y reescribe el server block):
   ```bash
   ssh user@vps "certbot --nginx -d exceltosky.example"
   ```

## Deploy de una nueva versión

Desde el repo local:

```bash
# 1. Build de producción
npm run build

# 2. Sincronizar al VPS
rsync -avz --delete dist/ user@vps:/var/www/exceltosky/dist/

# 3. (Opcional) Limpiar caché de navegador inválida — nginx ya devuelve cabeceras inmutables
```

Crear `deploy/deploy.sh` para automatizar:

```bash
#!/usr/bin/env bash
set -euo pipefail
npm run build
rsync -avz --delete dist/ "${DEPLOY_USER}@${DEPLOY_HOST}:/var/www/exceltosky/dist/"
echo "Deploy OK"
```

Y exportar `DEPLOY_USER` / `DEPLOY_HOST` en tu shell o en `.env.deploy`.

## Variables de entorno necesarias

El build de Vite incrusta las env vars en el bundle. Antes de `npm run build`, asegúrate de que `.env.local` (o `.env.production`) tiene:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

Si vas a CI/CD, inyéctalas en el job de build.

## Edge Functions Supabase

Estas viven en Supabase, no en el VPS. Deploy:

```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase functions deploy create --no-verify-jwt
npx supabase functions deploy delete --no-verify-jwt
npx supabase db push   # aplica migrations
```

`--no-verify-jwt` es importante porque queremos que cualquiera (sin auth) pueda llamar a `/create` y `/delete` desde el frontend.

## Cron de limpieza

La extensión `pg_cron` se activa en la migration `003_view_dashboard_rpc.sql` y programa el borrado de dashboards caducados a las 03:00 UTC cada día. Verifica con:

```sql
select * from cron.job;
```

## Healthcheck rápido tras deploy

```bash
curl -sI https://exceltosky.example | head -1   # 200 OK
curl -s https://exceltosky.example/manifest.webmanifest | head -5   # JSON
```

Y prueba flujo end-to-end manualmente: subir Excel → ver dashboard → compartir → abrir link en incógnito.
