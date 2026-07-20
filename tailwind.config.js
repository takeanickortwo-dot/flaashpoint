/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // FLASHPOINT phosphor-terminal palette (design.md §2)
        void: "#0A0B09",
        console: "#111310",
        raised: "#181B15",
        hairline: "#272B22",
        "hairline-strong": "#3B4136",
        bone: "#E8E6DC",
        field: "#969B8A",
        faint: "#5B6053",
        phosphor: "#FFB000",
        "phosphor-dim": "#8A6100",
        "signal-red": "#FF4A3D",
        "signal-green": "#3DDC84",
        teal: "#45C4B0",
        severe: "#FF7A29",
        // shadcn variable-driven colors (mapped to palette in index.css)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ['"Chakra Petch"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      maxWidth: {
        content: "1560px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        // FLASHPOINT motion language (design.md §6)
        "led-pulse": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "blink-hard": {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        "tape-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        sweep: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "draw-line": {
          from: { strokeDashoffset: "var(--draw-len, 300)" },
          to: { strokeDashoffset: "0" },
        },
        "flash-update": {
          from: { backgroundColor: "rgba(255,176,0,0.10)" },
          to: { backgroundColor: "transparent" },
        },
        "snap-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "dot-pulse": {
          "0%,100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
        "ring-shake": {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-2px)" },
          "75%": { transform: "translateX(2px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "led-pulse": "led-pulse 1.4s ease-in-out infinite",
        "blink-hard": "blink-hard 1s step-end infinite",
        "tape-scroll": "tape-scroll 48s linear infinite",
        sweep: "sweep 6s linear infinite",
        "draw-line": "draw-line 1.2s ease-out both",
        "flash-update": "flash-update 0.6s ease-out",
        "snap-in": "snap-in 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "dot-pulse": "dot-pulse 1.2s ease-in-out infinite",
        "ring-shake": "ring-shake 0.3s ease-in-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
