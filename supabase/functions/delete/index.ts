import { serve } from 'https://deno.land/std@0.215.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'

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

  let body: { slug?: unknown; deleteToken?: unknown }
  try { body = await req.json() } catch { return json({ error: 'JSON inválido.' }, 400) }
  if (typeof body.slug !== 'string' || typeof body.deleteToken !== 'string') {
    return json({ error: 'slug y deleteToken requeridos.' }, 400)
  }

  const { data: row } = await supabase
    .from('dashboards')
    .select('delete_token')
    .eq('slug', body.slug)
    .maybeSingle()
  if (!row) return json({ error: 'No existe.' }, 404)
  if (row.delete_token !== body.deleteToken) return json({ error: 'Token inválido.' }, 403)

  const { error } = await supabase.from('dashboards').delete().eq('slug', body.slug)
  if (error) return json({ error: error.message }, 500)
  return json({ ok: true }, 200)
})

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  })
}
