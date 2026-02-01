/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,md,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,md,mdx}",
    './components/**/*.{js,ts,jsx,tsx}',
    "./mdx-components.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: "class",
};
