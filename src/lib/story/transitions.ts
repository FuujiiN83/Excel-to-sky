// src/lib/story/transitions.ts
import type { TransitionKind } from './types'

/**
 * Spanish connector library (#128). Each scene gets a transition phrase
 * matching its narrative role + position. We rotate within a pool so
 * consecutive scenes don't repeat. Deterministic: a seeded index walk
 * picks the next phrase based on (kind, index) so a re-compose returns
 * the same story.
 */

const POOLS: Record<TransitionKind, ReadonlyArray<string>> = {
  open: [''],
  addition: [
    'Además,',
    'Por otro lado,',
    'A la par,',
    'En la misma línea,',
    'A esto se suma que',
    'Más concretamente,',
  ],
  contrast: [
    'Sin embargo,',
    'En cambio,',
    'No obstante,',
    'Aun así,',
    'Por el contrario,',
    'Aunque parezca contradictorio,',
  ],
  consequence: [
    'Por eso,',
    'Como resultado,',
    'En consecuencia,',
    'Esto se traduce en que',
    'De ahí que',
  ],
  enumeration: [
    'En primer lugar,',
    'En segundo lugar,',
    'A continuación,',
    'El siguiente punto:',
    'Otro hallazgo relevante:',
    'Por último,',
  ],
  closing: ['En resumen,', 'Cerramos con esto:', 'En conjunto,', 'Para terminar,', 'Conclusión:'],
}

/** Pick a phrase deterministically given a kind and a stable index. */
export function pickPhrase(kind: TransitionKind, index: number): string {
  const pool = POOLS[kind]
  if (!pool || pool.length === 0) return ''
  return pool[index % pool.length]
}
