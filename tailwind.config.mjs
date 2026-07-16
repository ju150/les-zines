/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte,md,mdx}'],
  theme: {
    extend: {
      colors: {
        sand:   { DEFAULT: '#F5F0E6', 2: '#EFE7D8' },
        paper:  '#FBF8F2',
        ink:    { DEFAULT: '#20302C', soft: '#465651', mute: '#7C8A85' },
        line:   { DEFAULT: '#E4DBCB', strong: '#D6CBB6' },
        pine:   { DEFAULT: '#123F39', 2: '#2E6B63', deep: '#0E322D' },
        ocean:  '#35726E',
        terra:  { DEFAULT: '#BF5836', 2: '#A5482B' },
        gold:   '#B0863B',
      },
      fontFamily: {
        script: ['"Great Vibes"', 'cursive'],
        serif:  ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:   ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: { content: '1200px' },
      boxShadow: {
        soft: '0 12px 34px -18px rgba(31,45,40,.35)',
        deep: '0 24px 60px -30px rgba(31,45,40,.45)',
      },
      letterSpacing: { eyebrow: '.28em' },
      transitionTimingFunction: { smooth: 'cubic-bezier(.2,.7,.2,1)' },
    },
  },
  plugins: [],
};
