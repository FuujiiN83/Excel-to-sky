import { useId, useState } from 'react'

interface HelpTipProps {
  /** Plain-text tooltip content. */
  content: string
  /** Direction the tooltip opens. Defaults to 'top'. */
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** ARIA label for the trigger button. Defaults to "Ayuda". */
  label?: string
}

/**
 * Tiny "?" icon that reveals a tooltip on hover, focus or click. Designed to
 * sit inline next to a control label without disrupting the layout.
 */
export function HelpTip({ content, side = 'top', label = 'Ayuda' }: HelpTipProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 6,
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        style={{
          width: 16,
          height: 16,
          padding: 0,
          background: 'transparent',
          color: 'var(--muted)',
          border: '1px solid var(--border-strong)',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
          cursor: 'help',
          display: 'grid',
          placeItems: 'center',
          lineHeight: 1,
        }}
      >
        ?
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          style={{
            position: 'absolute',
            zIndex: 50,
            padding: '8px 10px',
            background: 'var(--surface)',
            color: 'var(--ink)',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
            fontSize: 12,
            lineHeight: 1.45,
            width: 240,
            ...positionFor(side),
          }}
        >
          {content}
        </span>
      )}
    </span>
  )
}

function positionFor(side: 'top' | 'bottom' | 'left' | 'right'): React.CSSProperties {
  switch (side) {
    case 'bottom':
      return { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }
    case 'left':
      return { top: '50%', right: 'calc(100% + 6px)', transform: 'translateY(-50%)' }
    case 'right':
      return { top: '50%', left: 'calc(100% + 6px)', transform: 'translateY(-50%)' }
    case 'top':
    default:
      return { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' }
  }
}
