/**
 * Export an SVG chart as a downloadable file (#74 PNG / #75 SVG).
 *
 * Usage:
 *   exportSvgElementAsSvg(svgEl, 'mi-grafico')
 *   exportSvgElementAsPng(svgEl, 'mi-grafico', 1200)
 *
 * Both clone the live <svg> into a serialisable copy with the current theme's
 * computed colours inlined, so the downloaded file looks the same as on screen.
 */

export function exportSvgElementAsSvg(svg: SVGSVGElement, filename: string): void {
  const serialized = serialiseSvg(svg)
  const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  triggerDownload(blob, `${filename}.svg`)
}

export async function exportSvgElementAsPng(
  svg: SVGSVGElement,
  filename: string,
  /** Pixel width of the exported PNG. Height scales proportionally. */
  targetWidth = 1200,
): Promise<void> {
  const serialized = serialiseSvg(svg)
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const img = await loadImage(svgUrl)
    const naturalRatio = img.naturalHeight / img.naturalWidth || 1
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = Math.round(targetWidth * naturalRatio)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context no disponible.')
    // Paint the active background colour so the PNG isn't transparent on dark themes.
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
    ctx.fillStyle = bg || '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const pngBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas vacío.'))), 'image/png')
    })
    triggerDownload(pngBlob, `${filename}.png`)
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}

function serialiseSvg(svg: SVGSVGElement): string {
  // Clone so we can mutate without touching the live DOM.
  const clone = svg.cloneNode(true) as SVGSVGElement
  // Ensure the namespace + an explicit width/height so external viewers don't
  // collapse the image. viewBox is preserved from the original.
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  const bbox = svg.getBoundingClientRect()
  if (!clone.getAttribute('width')) clone.setAttribute('width', String(Math.round(bbox.width)))
  if (!clone.getAttribute('height')) clone.setAttribute('height', String(Math.round(bbox.height)))
  // Inline computed colours from CSS variables so a PNG of the SVG renders
  // without needing the host stylesheet (var(--sky) doesn't survive blob: URLs).
  inlineComputedColours(svg, clone)
  return new XMLSerializer().serializeToString(clone)
}

function inlineComputedColours(live: SVGSVGElement, target: SVGSVGElement): void {
  const liveDescendants = Array.from(live.querySelectorAll<SVGElement>('*'))
  const targetDescendants = Array.from(target.querySelectorAll<SVGElement>('*'))
  const len = Math.min(liveDescendants.length, targetDescendants.length)
  for (let i = 0; i < len; i++) {
    const computed = getComputedStyle(liveDescendants[i])
    const t = targetDescendants[i]
    for (const prop of ['fill', 'stroke', 'stop-color', 'color'] as const) {
      const val = computed.getPropertyValue(prop)
      if (val && val !== 'none') t.style.setProperty(prop, val)
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar el SVG en una imagen.'))
    img.src = src
  })
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
