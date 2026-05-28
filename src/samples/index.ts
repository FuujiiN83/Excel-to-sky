import type { Dataset } from '../types/dataset'
import { personas } from './personas'
import { viajes } from './viajes'
import { ventas } from './ventas'
import { energia } from './energia'
import { marketing } from './marketing'
import { encuestas } from './encuestas'
import { logistica } from './logistica'
import { salud } from './salud'
import { productos } from './productos'

export { personas, viajes, ventas, energia, marketing, encuestas, logistica, salud, productos }

export const SAMPLE_DATASETS: Record<string, Dataset> = {
  personas,
  viajes,
  ventas,
  energia,
  marketing,
  encuestas,
  logistica,
  salud,
  productos,
}
