/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        foreground: "#f4f4f5",
        cinema: {
          950: "#09090b",
          900: "#121216",
          850: "#18181f",
          800: "#22222a",
          700: "#32323e",
          600: "#4b4b5a",
          accent: "#e50914",
          accentHover: "#b80710",
        },
      },
    },
  },
  plugins: [],
};
