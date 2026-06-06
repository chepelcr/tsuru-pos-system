/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
        "accent-rose": {
          DEFAULT: "hsl(var(--accent-rose))",
          soft: "hsl(var(--accent-rose-soft))",
          dim: "hsl(var(--accent-rose-dim))",
          border: "hsl(var(--accent-rose-border))",
        },
      },
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        dropdown: "var(--shadow-dropdown)",
        "dropdown-up": "var(--shadow-dropdown-up)",
        modal: "var(--shadow-modal)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        overlay: "var(--z-overlay)",
        modal: "var(--z-modal)",
        tooltip: "var(--z-tooltip)",
      },
      fontFamily: {
        sans: ["Barlow", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["Barlow Condensed", "Barlow", "Arial Narrow", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "calc(var(--radius) + 4px)",
        md: "var(--radius)",
        sm: "calc(var(--radius) - 2px)",
      },
    },
  },
  plugins: [],
};
