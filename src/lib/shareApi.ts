import { supabase } from './supabase'
import type { Dataset } from '../types/dataset'

export interface CreatedDashboard {
  slug: string
  deleteToken: string
}

function supabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url) throw new Error('VITE_SUPABASE_URL no configurado.')
  return url
}

export async function createSharedDashboard(dataset: Dataset): Promise<CreatedDashboard> {
  const res = await fetch(`${supabaseUrl()}/functions/v1/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: dataset.label, data: dataset }),
  })
  const body = (await res.json()) as { slug?: string; deleteToken?: string; error?: string }
  if (!res.ok || !body.slug || !body.deleteToken) {
    throw new Error(body.error ?? `Error ${res.status}`)
  }
  return { slug: body.slug, deleteToken: body.deleteToken }
}

export async function deleteSharedDashboard(slug: string, deleteToken: string): Promise<void> {
  const res = await fetch(`${supabaseUrl()}/functions/v1/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, deleteToken }),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: `${res.status}` }))) as { error?: string }
    throw new Error(body.error ?? `Error ${res.status}`)
  }
}

export async function loadSharedDashboard(slug: string): Promise<Dataset> {
  const { data, error } = await supabase().rpc('view_dashboard', { p_slug: slug })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Dashboard no encontrado o caducado.')
  return row.data as Dataset
}
