---
version: alpha
name: Raycast
slug: raycast
source: https://www.raycast.com/
extractedAt: "2026-05-22"
description: "Dark, command-palette-native productivity identity with red action accents, glossy inset panels, precise 8px rhythm, huge cinematic serif hero type, and macOS-like utility surfaces."

colors:
  primary: "#ff6363"
  accent: "#56c2ff"
  accentHover: "#f28c8c"
  accentPressed: "#d72a2a"
  ink: "#ffffff"
  body: "#9c9c9d"
  muted: "#6a6b6c"
  canvas: "#07080a"
  surface: "#111214"
  surfaceAlt: "#0c0d0f"
  border: "#1b1c1e"
  borderStrong: "#434345"
  link: "#ff6363"
  success: "#59d499"
  warning: "#ff9217"
  error: "#ff6363"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  grey-50: "#e6e6e6"
  grey-100: "#cdcece"
  grey-200: "#9c9c9d"
  grey-300: "#6a6b6c"
  grey-400: "#434345"
  grey-500: "#2f3031"
  grey-600: "#1b1c1e"
  grey-700: "#111214"
  grey-800: "#0c0d0f"
  grey-900: "#07080a"
  card-border: "rgba(255,255,255,0.06)"
  card-highlight: "rgba(255,255,255,0.10)"
  glass-nav-start: "rgba(17,18,20,0.75)"
  glass-nav-end: "rgba(12,13,15,0.90)"
  danger-surface: "#2c1617"
  danger-border: "#833637"
  code-bg: "rgba(255,99,99,0.15)"
  focus-ring: "rgba(255,255,255,0.50)"
  glow-blue: "#0294fe"
  glow-purple: "#9b4dff"

typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: 168px
    fontWeight: 400
    lineHeight: 1.00
    letterSpacing: "-2px"
  hero:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: 86px
    fontWeight: 400
    lineHeight: 1.00
    letterSpacing: "-2px"
  headline-lg:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "0.02em"
  title-lg:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.50
    letterSpacing: "0em"
  title-md:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.2px"
  title-sm:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.40
    letterSpacing: "0.2px"
  body:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.60
    letterSpacing: "0.2px"
  label:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.60
    letterSpacing: "0.2px"
  button:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.14
    letterSpacing: "0.2px"
  caption:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.23
    letterSpacing: "0.1px"
  legal:
    fontFamily: "Inter, Inter Fallback, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: "0.4px"
  code:
    fontFamily: "JetBrains Mono, Menlo, Monaco, Courier, monospace"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: "0em"
  micro-mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: 10px
    fontWeight: 500
    lineHeight: 1.60
    letterSpacing: "0.2px"

rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 20px
  pill: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.grey-50}"
    textColor: "{colors.grey-500}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  button-primary-active:
    backgroundColor: "{colors.grey-100}"
    textColor: "{colors.grey-500}"
    rounded: "{rounded.md}"
  button-dark:
    backgroundColor: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.10))"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  nav-glass:
    backgroundColor: "linear-gradient(137deg, {colors.glass-nav-start} 4.87%, {colors.glass-nav-end} 75.88%)"
    textColor: "{colors.body}"
    rounded: "{rounded.xl}"
    padding: 16px 32px
  card-dark:
    backgroundColor: "linear-gradient(137deg, {colors.surface} 4.87%, {colors.surfaceAlt} 75.88%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  cta-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 24px
  search-modal:
    backgroundColor: "radial-gradient(100% 100% at 50% 0, {colors.grey-800} 0, {colors.grey-700} 150%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 16px
  command-row:
    backgroundColor: "rgba(255,255,255,0.00)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 8px 16px
  input-dark:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 16px
  pricing-card:
    backgroundColor: "linear-gradient(137deg, {colors.surface} 4.87%, {colors.surfaceAlt} 75.88%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 32px
  hotkey-key:
    backgroundColor: "radial-gradient(100% 100% at 50% 0, {colors.grey-800} 0, {colors.grey-700} 100%)"
    textColor: "{colors.body}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    padding: 0px 5px
  app-window-peek:
    backgroundColor: "{colors.surfaceAlt}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 0px
---

# Raycast → Proofport

Applied to the Proofport agent console. Source tokens above; implementation lives in `src/app/globals.css`, fonts in `src/app/layout.tsx`.

**Overview**
Raycast’s visual system is a dark productivity interface turned into a marketing language. It borrows directly from the command palette: compact rows, shortcut keys, floating search panels, inset borders, small metadata, and dense utility modules.

Key Characteristics:

- Dark canvas first: build from `{colors.canvas}` and layer only a few brighter surfaces.
- Red is the core action and brand accent; use `{colors.primary}` sparingly but decisively.
- Cards feel like dark metal: subtle gradients, 1px translucent borders, and inset top highlights.
- Typography is compact and exact, except for the homepage’s enormous serif wordmark-style hero.
- Interaction patterns echo Raycast itself: command rows, hotkeys, search modals, app icons, and floating windows.
- Spacing uses an 8px rhythm with 4px half-steps for dense controls.
- Motion is small and functional: scale on press, arrow nudges, fade-up entrances.

See the full colors, typography, layout, elevation, components, do’s/don’ts, and responsive notes in the YAML frontmatter and the original extraction brief.
