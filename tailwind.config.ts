import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#9A1C1F",
          dark: "#7E1619",
          light: "#FBEAEA",
        },
      },
    },
  },
  plugins: [],
};

export default config;
