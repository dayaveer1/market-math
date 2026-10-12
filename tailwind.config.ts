import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { paper: v('paper'), surface: v('surface'), ink: v('ink'), muted: v('muted'), line: v('line'), accent: v('accent'), bid: v('bid'), ask: v('ask') },
      fontFamily: { sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
} satisfies Config;
