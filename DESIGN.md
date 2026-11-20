# DESIGN.md — UI standard for DSH plugins

Every plugin in this workspace that renders UI follows this document. A plugin is not a
separate app: users see one DeepSeek Harness window, so plugin UI must look and behave
like the host.

Reference model: [Astryx](https://astryx.atmeta.com/) (Meta's open-source design system,
React 19 + StyleX). Astryx defines the *rules* — semantic tokens, layered surfaces, one
elevation per surface, 4px spacing, geometric type scale, restrained motion. The DSH host
defines the *values*: plugins style with the host's `--dsw-*` custom properties, never with
Astryx packages. Do not install `@astryxdesign/*`; it is not on the package whitelist and
would duplicate the host's theme.

## Non-negotiables

1. **Host tokens only.** Colors, borders, and shadows come from `--dsw-*` variables. No raw
   hex, `rgb()`, or `hsl()` in plugin UI. Artwork (icons, illustrations, previews) may use
   its own colors.
2. **Light and dark both work.** Never branch on theme in JS. A token resolves per mode; if
   a value looks wrong in one mode, the token is wrong, not the mode.
3. **No inline style objects for static styling.** Put CSS in a `<style>` element owned by
   the component (removed on unmount) or a module, scoped under the plugin prefix
   (`.dshl-`, `.dshn-`, `.dshEnhance-`). Inline `style` is only for computed values
   (widths, transforms, positions).
4. **Spacing on a 2px grid with a 4px rhythm.** Allowed gaps/padding: 0, 2, 4, 6, 8, 10,
   12, 14, 16, 20, 24, 28, 32, 40, 48. No 5, 7, 9, 11, 13, 15, 18, 22, 25.
5. **Type from the scale below.** No ad-hoc `font-size` values.
6. **Every interactive control is keyboard reachable** and shows the host focus ring.
7. **Every visible string goes through the Client locale service.** No literal UI text in
   components.
8. **Respect `prefers-reduced-motion`.** Motion is feedback, never decoration.

## Token bridge

Astryx names the role; the right column is the only legal implementation in a plugin.

### Surfaces and text

| Role (Astryx) | Plugin token |
| --- | --- |
| Page background (`--color-background-body`) | `--dsw-alias-bg-base` |
| Surface / panel (`--color-background-surface`) | `--dsw-alias-bg-layer-1` |
| Card, row, muted block (`--color-background-card`, `--color-background-muted`) | `--dsw-alias-bg-layer-2` |
| Popover, menu, dialog (`--color-background-popover`) | `--dsw-alias-bg-layer-3`, menus `--dsw-specific-menu` |
| Primary text (`--color-text-primary`) | `--dsw-alias-label-primary` |
| Secondary text (`--color-text-secondary`) | `--dsw-alias-label-secondary` |
| Metadata, captions (`--color-text-secondary` at small size) | `--dsw-alias-label-tertiary` |
| Disabled text | `--dsw-alias-label-tertiary` + `opacity: .6` |
| Inverted text on a filled control | `--dsw-alias-label-primary-inverted` |
| Link | `--dsw-alias-link` |
| Hairline border (`--color-border`) | `--dsw-alias-border-l1` |
| Emphasized border (`--color-border-emphasized`) | `--dsw-alias-border-l3` |
| Hover fill (`--color-overlay-hover`) | `--dsw-alias-interactive-bg-hover` |
| Pressed fill (`--color-overlay-pressed`) | `--dsw-alias-interactive-bg-active` |
| Accent / primary action (`--color-accent`) | `--dsw-alias-state-success-primary` |
| Focus ring | `--dsw-alias-state-business-primary` |

### Status

| Role | Plugin token |
| --- | --- |
| Info | `--dsw-alias-state-business-primary` |
| Success | `--dsw-alias-state-success-primary` |
| Warning | `--dsw-alias-state-warn-primary` |
| Error | `--dsw-alias-state-error-primary` |
| Done / neutral-complete | `--dsw-alias-state-done-primary` |
| Idle | `--dsw-alias-state-idle-primary` |

Status color is never the only signal: pair it with an icon or a word.

### Accent

The workspace accent is the notification green, `--dsw-alias-state-success-primary`.
Use it for the primary action, the active tab underline, the selected row edge, the avatar
fill, and checked controls. It is the same green the notification badge uses, so every
plugin reads as part of one window. Focus rings stay
`--dsw-alias-state-business-primary`; do not tint them green.

### Shape

| Role (Astryx) | Plugin token | Value |
| --- | --- | --- |
| Inner / small chip | `--dsw-radius-xs` | 4px |
| Control: button, input, select | `--dsw-radius-sm` | 8px |
| Element: card, row, menu item | `--dsw-radius-md` | 12px |
| Container: panel, dialog | `--dsw-radius-lg` | 16px |
| Page-level surface | `--dsw-radius-xl` | 20px |
| Chat / dock panel | `--dsw-radius-panel` | 28px |
| Pill: badge, tag, avatar dot | `9999px` | full |

Nested rounded elements stay concentric: inner radius = outer radius − padding.

### Elevation

One level per surface. If it does not overlap anything, it is flat.

| Level | Token | Use |
| --- | --- | --- |
| none | `none` + `--dsw-alias-border-l1` | cards in a grid, inline banners, normal buttons |
| low | `--dsw-elevation-soft` | raised card, composer, sticky bar |
| med | `--dsw-elevation-panel` | popover, menu, floating button |
| high | `--dsw-elevation-prominent` | modal dialog, full overlay |

`--dsw-shadow-lv1` … `--dsw-shadow-lv3` exist for host parity; prefer the semantic
`--dsw-elevation-*` tokens. A shadow never replaces a border on a flat surface.

### Motion

| Role | Value |
| --- | --- |
| Micro feedback (hover, press) | 100–150ms |
| Enter / exit (menu, dialog, panel) | 175–200ms |
| Continuous (progress, shimmer) | 900ms+ |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` (`--ds-ease-in-out`) |

Animate `opacity` and `transform` only. Never animate layout properties. Under
`prefers-reduced-motion: reduce`, drop to opacity-only or no transition.

## Typography

Host scale. Use these sizes and line heights; do not invent intermediate values.

| Role | Size / line-height | Weight |
| --- | --- | --- |
| Page title | 20 / 28 | 600 |
| Section title | 16 / 24 | 600 |
| Card title, emphasized body | 14 / 22 | 600 |
| Body | 13 / 20 | 400 |
| Body strong, label | 13 / 20 | 500 |
| Supporting, metadata | 12 / 18 | 400 |
| Caption, badge | 11 / 16 | 500 |
| Code, IDs, counts | 12 / 18 | 400, `--ds-font-family-code` |

- Font family: inherit. Never set `font-family` except for code.
- Numbers in tables and stats: `font-variant-numeric: tabular-nums`.
- Truncate with `text-overflow: ellipsis`; never clip mid-glyph with `overflow: hidden`
  alone.
- Body text never exceeds ~72 characters per line; cap prose containers.

## Layout and density

- Page padding: 20–24px horizontal, 16–20px vertical. Section gap: 16–24px. Row gap: 8–12px.
- Control height: 28px compact, 32px default, 36px prominent. Icon button: 28×28 or 32×32.
- Minimum hit target: 28×28px; 32×32 for primary actions.
- Lists and tables are rows with dividers (`--dsw-alias-border-l1`), edge to edge. Cards
  are for widgets, galleries, and settings groups — not for every list item.
- Sidebars and panels fill their slot: `height: 100%`, `min-height: 0`, one scroll region.
  Never nest two vertical scrollers.
- Empty state: one sentence of what is missing, one action. No illustration required.
- Long issue or description text clamps to 8 lines with a Show more toggle. One field never
  pushes the rest of the panel away.
- Loading: skeleton rows or a spinner, never a blank panel. Keep the previous content
  visible while refreshing.

## Components

Build controls from host markup and CSS patterns; do not import host client packages.
Match these behaviors.

### Button

- Variants: primary (filled `--dsw-alias-state-success-primary`, text
  `--dsw-alias-label-primary-inverted`), secondary (white surface
  `--dsw-alias-bg-layer-1`, `--dsw-alias-border-l1` border), ghost (transparent, hover
  fill), danger (white surface, text/border `--dsw-alias-state-error-primary`).
- Red is reserved for destructive, hard-to-undo actions: remove, clear, cancel in an
  external system. Archive, reject, send back, and other reversible steps are secondary.
- States: hover, active, focus-visible, disabled, loading (spinner replaces the label, width
  stays fixed).
- One primary button per view or dialog footer.

### Input, select, textarea

- Height 28/32px, `--dsw-radius-sm`, `--dsw-alias-border-l1`, background
  `--dsw-alias-bg-layer-1`, text `--dsw-alias-label-primary`, placeholder
  `--dsw-alias-label-tertiary`.
- Focus: border `--dsw-alias-state-business-primary` plus the host focus ring.
- Error: border `--dsw-alias-state-error-primary` and a message below, not a tooltip.
- Labels sit above the control; placeholders are examples, never labels.

### Card / row

- Card: `--dsw-alias-bg-layer-2`, `--dsw-radius-md`, 1px `--dsw-alias-border-l1`, padding
  12–16px, gap 8–12px.
- Row: 32–40px tall, 8–12px horizontal padding, hover
  `--dsw-alias-interactive-bg-hover`, selected `--dsw-alias-bg-layer-3` plus a 2px accent
  edge.

### Dialog / menu / popover

- Backdrop `--dsw-alias-bg-mask-1`; surface `--dsw-alias-bg-layer-3` with
  `--dsw-elevation-prominent`; `--dsw-radius-lg`; padding 16–20px.
- Escape closes, focus is trapped, focus returns to the trigger, `role="dialog"` +
  `aria-modal="true"` + `aria-labelledby`.
- Menus: `role="menu"`, arrow-key navigation, `--dsw-specific-menu` surface,
  `--dsw-elevation-panel`.

### Badge / tag

- Pill radius, 11/16 text, 2–8px padding, tinted background from the status token at low
  opacity, text from the same status token. Never a saturated fill with white text at small
  size.

### Tabs

- Underline or pill, 13/20 label, active state uses `--dsw-alias-label-primary` and an
  accent underline; inactive uses `--dsw-alias-label-secondary`. `role="tablist"` with
  arrow keys.

### Tooltip

- `--dsw-alias-tooltip-bg` / `--dsw-alias-tooltip-label`, 12/18, 4–8px padding,
  `--dsw-radius-sm`, appears after ~400ms hover or on focus, dismisses on Escape. Never the
  only place a required instruction lives.

## Accessibility

- Contrast: 4.5:1 for body text, 3:1 for large text and UI boundaries. Check both modes.
- Focus: use the host ring (`--dsw-focus-ring-width`, `--dsw-alias-state-business-primary`).
  Never `outline: none` without an equivalent visible replacement.
- Keyboard: every action reachable, logical tab order, Escape closes overlays, Enter
  submits.
- Semantics: real `<button>`, `<input>`, `<a>`; `aria-pressed` for toggles, `aria-checked`
  with `role="switch"` for switches, `aria-live="polite"` for async status.
- Icons that carry meaning get an accessible name; decorative icons get `aria-hidden`.
- Do not encode state in color alone.

## Internationalization

- All visible text through `ctx.locale` keys; add the key to every locale file the plugin
  ships.
- No concatenated sentences. Use placeholders (`{count}`, `{name}`) so word order can
  change.
- Layouts tolerate +40% string length: no fixed-width labels, no `white-space: nowrap` on
  prose.

## Plugin UI checklist

Before calling UI work done:

- [ ] No raw color values in plugin UI (`grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' <client file>`
      returns only artwork or computed values).
- [ ] Spacing values are on the 4px grid.
- [ ] Font sizes come from the table above.
- [ ] Light and dark both checked in the running page.
- [ ] Keyboard-only pass: tab through, open and close every overlay with Escape.
- [ ] Focus ring visible on every control.
- [ ] Empty, loading, and error states exist.
- [ ] Strings come from locale files.
- [ ] Reduced motion honored.
- [ ] No second scroll container, no `document.body` writes, no host DOM reads.

## Review commands

```bash
# hardcoded colors in a plugin client
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(' dsh-linear/client.js

# off-grid spacing
grep -nE '(padding|gap|margin)[^:]*:\s*[^;]*\b(5|7|9|11|13|15|18|22|25)px' dsh-linear/client.js

# ad-hoc font sizes
grep -nE 'font-size:\s*[0-9]+px' dsh-linear/client.js
```

A finding is fixed by moving to the nearest token, not by adding an exception.

## Astryx component mapping

When a plugin needs a pattern not listed here, read the Astryx component page for its
semantics and states, then implement it with host tokens:

| Need | Astryx reference |
| --- | --- |
| Page frame, panels | `AppShell`, `Layout`, `LayoutPanel` |
| Lists, settings groups | `List`, `Item`, `Card` |
| Actions | `Button`, `IconButton`, `ButtonGroup`, `ToggleButton` |
| Forms | `TextInput`, `Select`, `Checkbox`, `Radio`, `Switch` |
| Overlays | `Dialog`, `Popover`, `Menu`, `Tooltip`, `Banner` |
| Status | `Badge`, `Banner`, `Spinner`, `Skeleton` |
| Data | `Table`, `Tabs`, `Divider` |

Astryx rules that carry over unchanged: components over primitives, semantic tokens over
hardcoded values, theme-agnostic code, controlled form inputs, frame-first layout, dense
data as rows.
