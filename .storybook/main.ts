import type { StorybookConfig } from '@storybook/react-vite'

/**
 * Storybook baseline (#236). Wires the Vite-React preset so the existing
 * SVG charts and small components render out-of-the-box. No stories shipped
 * yet — drop the first ones under src/**\/*.stories.tsx. Tailwind utilities
 * + index.css load automatically via preview.ts.
 *
 * Run: `npm run storybook` (port 6006).
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
  docs: { autodocs: 'tag' },
  staticDirs: ['../public'],
}

export default config
