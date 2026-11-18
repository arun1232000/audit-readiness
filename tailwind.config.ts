import type { Config } from 'tailwindcss';

/** Design tokens mirror the CSS variables in src/styles/theme.css (the page design). Preflight is off so
 *  Tailwind never overrides the design's own base styles; utilities remain available for additions. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        ink: 'var(--text)',
        'ink-2': 'var(--text-2)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        line: 'var(--line)',
        accent: 'var(--yellow)',
        dawn: 'var(--dawn)',
        clay: 'var(--clay)',
        sage: 'var(--sage)',
      },
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'Arial', 'sans-serif'] },
      borderRadius: { card: 'var(--r-lg)' },
      maxWidth: { wide: 'var(--wide)', col: 'var(--col)' },
    },
  },
  plugins: [],
} satisfies Config;
