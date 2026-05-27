import { supabase } from './supabase'
import type { Dataset } from '../types/dataset'
import { reportNetworkError } from './networkError'

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
  let res: Response
  try {
    res = await fetch(`${supabaseUrl()}/functions/v1/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dataset.label, data: dataset }),
    })
  } catch (err) {
    reportNetworkError(
      {
        context: 'share-api',
        message:
          'No se pudo contactar con el servicio de compartir. Comprueba tu conexión y reintenta.',
      },
      err,
    )
    throw err
  }
  const body = (await res.json().catch(() => ({}))) as {
    slug?: string
    deleteToken?: string
    error?: string
  }
  if (!res.ok || !body.slug || !body.deleteToken) {
    const message = body.error ?? `Error ${res.status} al crear el dashboard.`
    reportNetworkError({ context: 'share-api', message, status: res.status })
    throw new Error(message)
  }
  return { slug: body.slug, deleteToken: body.deleteToken }
}

export async function deleteSharedDashboard(slug: string, deleteToken: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${supabaseUrl()}/functions/v1/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, deleteToken }),
    })
  } catch (err) {
    reportNetworkError(
      {
        context: 'share-api',
        message: 'No se pudo conectar para eliminar el dashboard. Reintenta en unos segundos.',
      },
      err,
    )
    throw err
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: `${res.status}` }))) as { error?: string }
    const message = body.error ?? `Error ${res.status} al eliminar el dashboard.`
    reportNetworkError({ context: 'share-api', message, status: res.status })
    throw new Error(message)
  }
}

export async function loadSharedDashboard(slug: string): Promise<Dataset> {
  const { data, error } = await supabase().rpc('view_dashboard', { p_slug: slug })
  if (error) {
    reportNetworkError(
      {
        context: 'share-api',
        message: `No se pudo cargar el dashboard compartido: ${error.message}`,
      },
      error,
    )
    throw new Error(error.message)
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    const message = 'Dashboard no encontrado o caducado.'
    reportNetworkError({ context: 'share-api', message, status: 404 })
    throw new Error(message)
  }
  return row.data as Dataset
}
