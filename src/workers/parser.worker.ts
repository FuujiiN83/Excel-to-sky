import * as XLSX from 'xlsx'
import { inferColumnType } from '../lib/typeDetection'
import type { Dataset, Column, CellValue } from '../types/dataset'

export interface ParseRequest { fileBuffer: ArrayBuffer; fileName: string }
export interface ParseSuccess { ok: true; dataset: Dataset }
export interface ParseError { ok: false; error: string }
export type ParseResponse = ParseSuccess | ParseError

self.addEventListener('message', (event: MessageEvent<ParseRequest>) => {
  try {
    const { fileBuffer, fileName } = event.data
    const wb = XLSX.read(fileBuffer, { type: 'array', cellDates: true })
    const sheetName = wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })

    if (rawRows.length === 0) {
      const response: ParseResponse = { ok: false, error: 'El Excel no tiene filas.' }
      ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
      return
    }

    const headers = Object.keys(rawRows[0])
    const columns: Column[] = headers.map((h, i) => {
      const values = rawRows.map(r => (r[h] == null ? null : String(r[h])))
      return {
        key: `col_${i}`,
        label: h,
        originalLabel: h,
        type: inferColumnType(values),
      }
    })

    const rows: Record<string, CellValue>[] = rawRows.map(r => {
      const obj: Record<string, CellValue> = {}
      headers.forEach((h, i) => {
        const v = r[h]
        if (v == null) {
          obj[`col_${i}`] = null
        } else if (typeof v === 'number' || typeof v === 'boolean') {
          obj[`col_${i}`] = v
        } else {
          obj[`col_${i}`] = String(v)
        }
      })
      return obj
    })

    const dataset: Dataset = {
      id: 'uploaded',
      label: fileName.replace(/\.[^.]+$/, ''),
      columns,
      rows,
      createdAt: new Date().toISOString(),
    }
    const response: ParseResponse = { ok: true, dataset }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  } catch (err) {
    const response: ParseResponse = { ok: false, error: err instanceof Error ? err.message : 'Error desconocido al parsear el Excel.' }
    ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(response)
  }
})
