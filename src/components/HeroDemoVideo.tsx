import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Self-hosted hero demo (#213). Tries to load a short looping clip of the
 * upload → dashboard → insights flow from `public/demo.webm` (with mp4
 * fallback). When the asset is missing or the browser refuses to play it,
 * we transparently render the `fallback` SVG/CSS animation instead so the
 * landing never shows a broken video frame.
 *
 * Add the asset files at:
 *   - public/demo.webm   (preferred, smaller)
 *   - public/demo.mp4    (Safari/iOS fallback)
 *   - public/demo-poster.jpg (initial frame before the video buffers)
 *
 * The reachability check is a `HEAD` on the webm URL — cheap, cached, and
 * avoids loading the (potentially MB-sized) file when it isn't there.
 */

interface HeroDemoVideoProps {
  fallback: ReactNode
}

const WEBM = '/demo.webm'
const MP4 = '/demo.mp4'
const POSTER = '/demo-poster.jpg'

type Status = 'probing' | 'ready' | 'missing'

export function HeroDemoVideo({ fallback }: HeroDemoVideoProps): JSX.Element {
  const [status, setStatus] = useState<Status>('probing')
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch(WEBM, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return
        setStatus(res.ok ? 'ready' : 'missing')
      })
      .catch(() => {
        if (!cancelled) setStatus('missing')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // While probing, render the fallback so the layout doesn't pop. The
  // probe finishes in a few ms on cache hit, slightly longer on first visit.
  if (status !== 'ready') return <>{fallback}</>

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 560,
        zIndex: 1,
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={POSTER}
        onError={() => setStatus('missing')}
        aria-label="Demostración: archivo Excel cargándose y transformándose en un dashboard."
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <source src={WEBM} type="video/webm" />
        <source src={MP4} type="video/mp4" />
      </video>
    </div>
  )
}
