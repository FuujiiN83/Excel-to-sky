/**
 * Pure-SVG word cloud (#70). A real spiral-packed cloud needs collision
 * detection per word — overkill for the dashboards we render today. Instead
 * we use a row-flow layout: words ordered descending by frequency, sized
 * monotonically, wrapped across rows until the canvas fills. Good signal
 * for "what's loud in this text column" without the complexity tax.
 *
 * Spanish + English stop-word filter built in. Callers may pass extra
 * stop-words for their domain (e.g. "fácil", "tarjeta" if those flood the
 * input).
 */

interface ChartWordCloudProps {
  /** Source text — usually `dataset.rows.map((r) => r[col.key]).join(' ')`. */
  text: string
  /** Extra words to drop on top of the built-in Spanish/English stop list. */
  extraStopwords?: ReadonlyArray<string>
  /** Maximum words rendered. Defaults 60. */
  maxWords?: number
  height?: number
  ariaLabel?: string
}

const STOPWORDS_ES =
  'a al algo algunos algunas ante ante aquel aquella aquellas aquello aquellos aqui así asi aún aun ayer cada como con contra cual cuales cualquier cuando de del desde donde dos el la los las él ella ellas ellos en entre era erais éramos eran eras es esa esas ese esos esta estas este estos esto fue fueron fui fuimos había habían hacia hasta hay he hemos hizo la las le les lo los más mas me mi mis muchos muy nada ni no nos nosotros nuestra nuestras nuestro nuestros o otra otras otro otros para pero poco por porque puede pueden qué que quien quienes se ser si sí sido siendo sin sobre solo sólo son su sus tan también tampoco te tendrá tendrán tener tengo ti tiene tienen toda todas todo todos un una unas unos uno ya yo'
const STOPWORDS_EN =
  'a about again all also am an and any are as at be because been before being between both but by can could did do does doing each few for from further had has have having he her here him himself his how i if in into is it its itself just may me might more most must my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your'
const STOPWORDS = new Set([...STOPWORDS_ES.split(' '), ...STOPWORDS_EN.split(' ')])

interface TokenCount {
  word: string
  count: number
}

function tokenize(text: string, stop: Set<string>): TokenCount[] {
  const tokens = text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stop.has(w) && !/^\d+$/.test(w))
  const counts = new Map<string, number>()
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1)
  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
}

export function ChartWordCloud({
  text,
  extraStopwords,
  maxWords = 60,
  height = 280,
  ariaLabel,
}: ChartWordCloudProps): JSX.Element | null {
  const stop = new Set(STOPWORDS)
  for (const w of extraStopwords ?? []) stop.add(w.toLowerCase())
  const tokens = tokenize(text, stop).slice(0, maxWords)
  if (tokens.length === 0) return null
  const maxCount = tokens[0].count
  const minCount = tokens[tokens.length - 1].count
  const range = Math.max(1, maxCount - minCount)
  const label = ariaLabel ?? `Nube de palabras con ${tokens.length} términos frecuentes.`

  return (
    <div
      role="img"
      aria-label={label}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 14px',
        padding: 16,
        height,
        overflow: 'hidden',
        alignContent: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid var(--border)',
      }}
    >
      {tokens.map((t) => {
        const norm = (t.count - minCount) / range
        const size = 12 + norm * 28
        const weight = 400 + Math.round(norm * 300)
        const opacity = 0.45 + norm * 0.55
        return (
          <span
            key={t.word}
            title={`${t.word} — ${t.count}`}
            style={{
              fontSize: size,
              fontWeight: weight,
              color: 'var(--ink)',
              opacity,
              lineHeight: 1.1,
              fontFamily: 'var(--font-display, system-ui)',
              letterSpacing: '-0.02em',
            }}
          >
            {t.word}
          </span>
        )
      })}
    </div>
  )
}
