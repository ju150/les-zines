// Tailwind 3 branché en PostCSS direct (@astrojs/tailwind ne supporte pas Astro 7).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
