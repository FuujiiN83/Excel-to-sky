import { useEffect, useMemo, useRef, useState } from 'react'
import type { Scene, Story } from '../lib/story/types'
import type { Dataset } from '../types/dataset'
import { analyzeDataset } from '../lib/insights'
import { buildComposeInput, compose } from '../lib/story/composer'
import { useSettings } from '../lib/SettingsContext'

/**
 * Scrollytelling renderer for a composed Story (sub-project #4).
 *
 * - #132 IntersectionObserver toggles each scene's `data-active` attribute
 *   as it enters the viewport, driving CSS transitions on the side rail and
 *   on `prefers-reduced-motion` opt-outs.
 * - #136 Side rail of scene markers; the active scene is highlighted.
 * - #138 j / k / ↑ / ↓ scroll to the previous / next scene.
 * - #139 "Saltar al cierre" link jumps to the resolution scene.
 * - #141 The dedicated print stylesheet in index.css flattens stages for paper.
 *
 * Renderer is intentionally chart-agnostic: each scene carries hints
 * (kind + columns) but actual chart components are not mounted here yet —
 * a follow-up will swap in the real ChartBar/ChartLine/etc. once the public
 * page surfaces this view.
 */

interface StoryPageProps {
  /** Pass a precomputed story to skip the analyze+compose step. */
  story?: Story
  /** Otherwise the page composes a story from the dataset on mount. */
  dataset?: Dataset
  onExit?: () => void
}

export function StoryPage(props: StoryPageProps): JSX.Element {
  const { settings } = useSettings()
  const [composed, setComposed] = useState<Story | null>(props.story ?? null)
  const [error, setError] = useState<string | null>(null)

  // When given a dataset, analyze + compose lazily on mount. Cached by dataset
  // identity so navigating away and back doesn't re-run the worker.
  useEffect(() => {
    if (props.story) return
    if (!props.dataset) return
    let cancelled = false
    setComposed(null)
    setError(null)
    void analyzeDataset(props.dataset, { locale: settings.uiLocale })
      .then((report) => {
        if (cancelled) return
        const labels: Record<string, string> = {}
        for (const c of props.dataset!.columns) labels[c.key] = c.label
        const story = compose(
          buildComposeInput(report, props.dataset!.id, props.dataset!.label, labels),
          settings.uiLocale,
        )
        setComposed(story)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error componiendo la narrativa.')
      })
    return () => {
      cancelled = true
    }
  }, [props.dataset, props.story, settings.uiLocale])

  if (error) {
    return (
      <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (!composed) {
    return (
      <div style={{ padding: 64, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
        Componiendo la historia…
      </div>
    )
  }

  return <StoryView story={composed} onExit={props.onExit} />
}

interface StoryViewProps {
  story: Story
  onExit?: () => void
}

function StoryView({ story, onExit }: StoryViewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  // Cumulative time the reader has spent past each scene boundary, used by
  // the progress rail to grow smoothly with scroll position.
  const cumulativeTimes = useMemo(() => {
    const totals: number[] = []
    let acc = 0
    for (const s of story.scenes) {
      acc += s.readingTimeSec
      totals.push(acc)
    }
    return totals
  }, [story])

  // IntersectionObserver — set the active scene to whichever has the largest
  // intersection ratio inside the viewport (#132).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const sceneEls = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[data-scene-index]') ?? [],
    )
    if (sceneEls.length === 0) return
    let best = { idx: 0, ratio: 0 }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const idx = Number((entry.target as HTMLElement).dataset.sceneIndex)
          if (!Number.isFinite(idx)) continue
          if (entry.intersectionRatio > best.ratio) best = { idx, ratio: entry.intersectionRatio }
        }
        // After the batch settles, commit the winner. Reset best for the next batch.
        if (best.ratio > 0) {
          setActiveIndex(best.idx)
          best = { idx: best.idx, ratio: 0 }
        }
      },
      {
        rootMargin: '-30% 0px -50% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )
    for (const el of sceneEls) obs.observe(el)
    return () => obs.disconnect()
  }, [story])

  // Keyboard navigation between scenes (#138). j / ↓ → next; k / ↑ → previous.
  // Bail out when the focus is in an input / textarea so typing isn't hijacked.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToScene(Math.min(story.scenes.length - 1, activeIndex + 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        scrollToScene(Math.max(0, activeIndex - 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, story])

  function scrollToScene(index: number): void {
    const el = document.querySelector<HTMLElement>(`[data-scene-index="${index}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const closingIndex = story.scenes.findIndex((s) => s.role === 'resolution')

  return (
    <div ref={containerRef} className="ets-story-root">
      <Header
        story={story}
        activeIndex={activeIndex}
        onExit={onExit}
        onSkipToClose={() =>
          scrollToScene(closingIndex >= 0 ? closingIndex : story.scenes.length - 1)
        }
      />
      <ProgressRail
        story={story}
        activeIndex={activeIndex}
        cumulativeTimes={cumulativeTimes}
        onPick={scrollToScene}
      />
      <main id="story-content" className="ets-story-main">
        {story.scenes.map((scene, i) => (
          <SceneBlock key={scene.id} scene={scene} index={i} isActive={i === activeIndex} />
        ))}
      </main>
    </div>
  )
}

interface HeaderProps {
  story: Story
  activeIndex: number
  onExit?: () => void
  onSkipToClose: () => void
}

function Header({ story, activeIndex, onExit, onSkipToClose }: HeaderProps): JSX.Element {
  const remaining = Math.max(
    0,
    story.scenes.slice(activeIndex).reduce((s, x) => s + x.readingTimeSec, 0),
  )
  return (
    <header
      className="ets-story-header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: 'color-mix(in oklab, var(--bg) 70%, transparent)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
        <span
          className="font-mono"
          style={{
            fontSize: 10,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {String(activeIndex + 1).padStart(2, '0')} /{' '}
          {String(story.scenes.length).padStart(2, '0')}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--ink-2)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {story.datasetLabel}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono, monospace)',
          }}
          aria-label={`Quedan aproximadamente ${Math.round(remaining / 60)} minutos`}
        >
          {Math.max(1, Math.round(remaining / 60))} min restantes
        </span>
      </div>
      <nav style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={onSkipToClose}
          style={{
            background: 'transparent',
            border: '1px solid var(--border-strong)',
            color: 'var(--ink-2)',
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Saltar al cierre
        </button>
        {onExit && (
          <button
            type="button"
            onClick={onExit}
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              border: 'none',
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Salir
          </button>
        )}
      </nav>
    </header>
  )
}

interface ProgressRailProps {
  story: Story
  activeIndex: number
  cumulativeTimes: number[]
  onPick: (index: number) => void
}

function ProgressRail({
  story,
  activeIndex,
  cumulativeTimes,
  onPick,
}: ProgressRailProps): JSX.Element {
  const total = cumulativeTimes[cumulativeTimes.length - 1] || 1
  return (
    <aside
      className="ets-story-rail"
      aria-label="Progreso de la narrativa"
      style={{
        position: 'fixed',
        left: 16,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '14px 8px',
        background: 'color-mix(in oklab, var(--bg) 80%, transparent)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {story.scenes.map((scene, i) => {
        const isActive = i === activeIndex
        const progress = (cumulativeTimes[i] / total) * 100
        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => onPick(i)}
            title={scene.title}
            aria-current={isActive ? 'true' : undefined}
            style={{
              width: isActive ? 30 : 14,
              height: 3,
              background: isActive
                ? 'var(--sky)'
                : `color-mix(in oklab, var(--sky) ${Math.min(100, progress)}%, var(--border-strong))`,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'width 180ms ease',
            }}
          />
        )
      })}
    </aside>
  )
}

interface SceneBlockProps {
  scene: Scene
  index: number
  isActive: boolean
}

function SceneBlock({ scene, index, isActive }: SceneBlockProps): JSX.Element {
  return (
    <section
      data-scene-index={index}
      data-active={isActive}
      data-scene-role={scene.role}
      className="ets-story-scene"
      style={{
        minHeight: scene.role === 'tension' ? '90vh' : '70vh',
        padding: '15vh 24px 12vh',
        maxWidth: 880,
        margin: '0 auto',
        opacity: isActive ? 1 : 0.55,
        transform: isActive ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 320ms ease, transform 320ms ease',
      }}
    >
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 16,
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: scene.role === 'tension' ? 'var(--sky)' : 'var(--muted)',
            }}
          >
            {scene.role === 'intro'
              ? 'Apertura'
              : scene.role === 'resolution'
                ? 'Cierre'
                : `Escena ${String(index + 1).padStart(2, '0')}`}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: 'var(--muted)',
            }}
            aria-label={`Lectura estimada ${scene.readingTimeSec} segundos`}
          >
            {scene.readingTimeSec}s
          </span>
        </div>
        <h2
          className="font-display"
          style={{
            fontSize: 'clamp(28px, 3.5vw, 48px)',
            fontWeight: 600,
            color: 'var(--ink)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: 0,
          }}
        >
          {scene.title}
        </h2>
      </header>
      <p
        style={{
          fontSize: 'clamp(16px, 1.4vw, 19px)',
          color: 'var(--ink-2)',
          lineHeight: 1.65,
          margin: 0,
          maxWidth: 720,
        }}
      >
        {scene.transition.phrase && (
          <span style={{ color: 'var(--muted)' }}>{scene.transition.phrase} </span>
        )}
        {scene.body}
      </p>
      {scene.charts.length > 0 && (
        <div
          style={{
            marginTop: 32,
            padding: 20,
            border: '1px dashed var(--border)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <div
            className="font-mono"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              marginBottom: 8,
            }}
          >
            Gráfico sugerido — {scene.charts[0].kind}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            {scene.charts[0].columns.join(' × ') || 'sin columnas asignadas'}
          </div>
        </div>
      )}
    </section>
  )
}
