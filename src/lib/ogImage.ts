import type { Dataset } from '../types/dataset'

/**
 * Generate a 1200×630 Open Graph card for a dataset entirely on the client
 * (#155). Returns a data URL so callers can download it or stamp it into a
 * `<meta property="og:image">` tag for live browser previews. No external
 * API; we draw with Canvas2D.
 *
 * Note: meta tags injected by JS don't help server-side crawlers (Facebook,
 * Twitter scrape the static HTML). This card is therefore most useful as a
 * downloadable share asset — for full crawler coverage we still need a
 * build-time renderer, tracked separately.
 */

const W = 1200
const H = 630

export async function generateOGImage(dataset: Dataset): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Background — diagonal gradient mimicking the dark Ethereal Glass theme.
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#07080B')
  bg.addColorStop(1, '#13161D')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Hairline grid overlay
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < W; x += 48) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, H)
    ctx.stroke()
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }

  // Top label
  ctx.fillStyle = '#4D9EFA'
  ctx.fillRect(80, 80, 48, 1)
  ctx.fillStyle = '#9CA3AF'
  ctx.font = '500 18px ui-monospace, "JetBrains Mono", monospace'
  ctx.fillText('EXCEL  /  SKY', 144, 90)

  // Dataset label as the main title — wrap at 20 chars per line if long.
  const label = (dataset.label || 'Dashboard').slice(0, 60)
  ctx.fillStyle = '#F4F6FB'
  ctx.font = '700 80px "Plus Jakarta Sans", system-ui, sans-serif'
  wrapText(ctx, label, 80, 260, W - 160, 92)

  // Subtitle — rows × columns mix.
  const numeric = dataset.columns.filter((c) => c.type === 'number' || c.type === 'currency').length
  const date = dataset.columns.filter((c) => c.type === 'date').length
  const text = dataset.columns.length - numeric - date
  const subtitle =
    `${dataset.rows.toLocaleString('es-ES')} filas · ${dataset.columns.length} columnas  ·  ` +
    `${numeric} numéricas · ${text} texto · ${date} fechas`
  ctx.fillStyle = '#A0A4AF'
  ctx.font = '500 30px "Plus Jakarta Sans", system-ui, sans-serif'
  ctx.fillText(subtitle, 80, 440)

  // Brand strip
  ctx.fillStyle = '#6B7280'
  ctx.font = '500 18px ui-monospace, monospace'
  ctx.fillText('100% LOCAL  ·  SIN CUENTA  ·  EXCELTOSKY.COM', 80, 580)

  // Small accent dots representing data points
  for (let i = 0; i < 8; i++) {
    const cx = 940 + (i % 4) * 50
    const cy = 80 + Math.floor(i / 4) * 50
    const alpha = 0.35 + (i % 4) * 0.18
    ctx.fillStyle = `rgba(125,227,200,${alpha})`
    ctx.beginPath()
    ctx.arc(cx, cy, 14, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toDataURL('image/png')
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/)
  let line = ''
  let cursorY = y
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY)
      line = word
      cursorY += lineHeight
    } else {
      line = candidate
    }
  }
  if (line) ctx.fillText(line, x, cursorY)
}

/**
 * Stamp the generated card onto the live document's <meta og:image> tag.
 * Useful when the user lands on /d/slug in a real browser — the meta swap
 * doesn't help server-side crawlers, but it does let "View page source"
 * downloads pick up the right asset.
 */
export async function installOGImage(dataset: Dataset): Promise<void> {
  const url = await generateOGImage(dataset)
  if (!url) return
  const apply = (selector: string, attr: string): void => {
    const el = document.querySelector(selector) as HTMLMetaElement | null
    if (el) el.setAttribute(attr, url)
  }
  apply('meta[property="og:image"]', 'content')
  apply('meta[property="og:image:type"]', 'content')
  apply('meta[name="twitter:image"]', 'content')
  // Type attribute should now be PNG since the live card is a data URL PNG.
  const ogType = document.querySelector('meta[property="og:image:type"]') as HTMLMetaElement | null
  if (ogType) ogType.setAttribute('content', 'image/png')
}
