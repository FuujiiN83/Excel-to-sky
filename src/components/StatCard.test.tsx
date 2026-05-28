import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MiniSpark } from './StatCard'

describe('MiniSpark', () => {
  it('wires a gradient area fill with a unique id per instance', () => {
    const html = renderToStaticMarkup(
      <>
        <MiniSpark values={[1, 2, 3, 2]} accent="sky" />
        <MiniSpark values={[3, 2, 1, 4]} accent="mint" />
      </>,
    )

    const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])

    // Each spark's area path must reference its own gradient by id.
    for (const id of ids) {
      expect(html).toContain(`fill="url(#${id})"`)
    }
  })

  it('renders nothing but a spacer when there are no values', () => {
    const html = renderToStaticMarkup(<MiniSpark values={[]} accent="sky" />)
    expect(html).not.toContain('<svg')
  })
})
