---
version: alpha
name: ThoughtLab
slug: thoughtlab
source: https://www.thoughtlab.com/
extractedAt: "2026-07-03"
description: "Obsidian monument with crimson signal. Void-black canvas where a single saturated red pill is the only chromatic object in a cathedral of oversized white type."

colors:
  void: "#000000"
  ash: "#cccccc"
  frost: "#ffffff"
  graphite: "#4c4c4c"
  crimson-signal: "#fc1c46"

typography:
  family: "Space Grotesk (Sui substitute)"
  caption: { size: 10px, lineHeight: 1.25, weight: 400 }
  body-sm: { size: 14px, lineHeight: 1.15, weight: 400 }
  subheading: { size: 18px, lineHeight: 1.1, weight: 400 }
  heading-sm: { size: 27px, lineHeight: 1.2, weight: 400 }
  heading: { size: 72px, lineHeight: 1.1, weight: 400 }
  heading-lg: { size: 91px, lineHeight: 0.92, weight: 700, letterSpacing: "-1.82px" }
  display: { size: 198px, lineHeight: 0.96, weight: 700, letterSpacing: "-1.78px" }

rounded:
  buttons: 9999px
  cards: 0px
  inputs: 0px

spacing:
  page-margin: 126px
  section-gap: 86px
  card-padding: 22px
  element-gap: 9px
---

# ThoughtLab → Proofport

Applied to the Proofport agent console. Source tokens above; implementation in `src/app/globals.css`, font in `src/app/layout.tsx` (Space Grotesk as Sui substitute).

**Status:** Console UI aligned to this lock (void canvas, crimson CTA-only, transparent modules, monumental brand type). Single route `/` — all demo surfaces live on the agent console.

**Overview**
Black-cathedral design: pure void canvas, one crimson pulse, typography so large it functions as architecture. Almost entirely achromatic — ash for body, frost for display — with crimson only on the single primary action.

Key Characteristics:

- Void canvas first (`#000000`); no elevation, no glows, no card fills.
- Crimson Signal (`#fc1c46`) once per view on the primary pill (+ logo mark).
- Hierarchy via extreme scale jumps (display → 14px), not color or shadow.
- Weightless components: transparent modules, hairline inputs, pill buttons.
- Sole typeface; weight 700 for monumental display, 400 for the rest.
