import type { Dataset } from '../types/dataset'
import { personas } from './personas'
import { viajes } from './viajes'
import { ventas } from './ventas'

export { personas, viajes, ventas }

export const SAMPLE_DATASETS: Record<string, Dataset> = {
  personas,
  viajes,
  ventas,
}
