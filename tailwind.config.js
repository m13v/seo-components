/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{ts,tsx,js,jsx}",
    "./src/lib/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "seo-accent": "var(--seo-accent, #14b8a6)",
        "seo-accent-dark": "var(--seo-accent-dark, #0d9488)",
        "seo-accent-light": "var(--seo-accent-light, #2dd4bf)",
      },
    },
  },
  plugins: [],
};
