import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'
import { customAlphabet } from 'https://esm.sh/nanoid@5.0.0'

const SLUG = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12)
const TOKEN = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32)
const MAX_BYTES = 5 * 1024 * 1024
const HOURLY_LIMIT = 10

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const windowStart = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000).toISOString()

  const { data: limit } = await supabase
    .from('rate_limits')
    .select('count')
    .eq('ip', ip)
    .eq('window_start', windowStart)
    .maybeSingle()
  const current = limit?.count ?? 0
  if (current >= HOURLY_LIMIT) return json({ error: 'Demasiadas creaciones esta hora. Inténtalo más tarde.' }, 429)

  const body = await req.text()
  if (body.length > MAX_BYTES) return json({ error: 'Payload excede 5 MB.' }, 413)

  let payload: { name?: unknown; data?: unknown }
  try { payload = JSON.parse(body) } catch { return json({ error: 'JSON inválido.' }, 400) }
  if (typeof payload.name !== 'string' || !payload.name.trim()) return json({ error: 'name requerido.' }, 400)
  if (typeof payload.data !== 'object' || payload.data === null) return json({ error: 'data requerido.' }, 400)

  const slug = SLUG()
  const deleteToken = TOKEN()
  const { error } = await supabase.from('dashboards').insert({
    slug,
    name: payload.name.trim().slice(0, 200),
    data: payload.data,
    delete_token: deleteToken,
  })
  if (error) return json({ error: error.message }, 500)

  await supabase
    .from('rate_limits')
    .upsert({ ip, window_start: windowStart, count: current + 1 }, { onConflict: 'ip,window_start' })

  return json({ slug, deleteToken }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}
