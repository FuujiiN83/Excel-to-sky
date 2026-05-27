import type { Accent } from '../types/dataset'
import type { Palette } from './settings'

/**
 * Map the user-selected palette onto a concrete chart accent. The natural
 * accent comes from the column's type / explicit color; the palette either
 * preserves it ('mixed') or forces a single one (solid presets).
 */
export function accentForPalette(palette: Palette, natural: Accent): Accent {
  switch (palette) {
    case 'mixed':
      return natural
    case 'sky':
      return 'sky'
    case 'mint':
      return 'mint'
    case 'plum':
      return 'plum'
    case 'amber':
      return 'amber'
  }
}
