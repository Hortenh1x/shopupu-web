# Design

Visual system for shopupu-web, derived from the Uiverse "Tangerine Capital" design system (colors, type, component treatment) re-aimed at a clothing shop. Implemented as plain global CSS classes in `src/app/globals.css`; fonts loaded via `next/font` in `src/app/layout.tsx`.

## Theme

Light, warm, editorial. Cream paper background, tangerine as the committed brand color, golden-yellow highlight marks, near-black warm ink. Dark ink panels are used as accents (hero footers, summary panels), never as the page default.

## Color palette

Source of truth: hex from the reference; OKLCH equivalents given for derivation of tints.

| Token | Hex | OKLCH | Role |
| --- | --- | --- | --- |
| `--bg` | `#F4ECD8` | oklch(0.944 0.028 89) | page background (cream) |
| `--surface` | `#FBF6EA` | oklch(0.974 0.017 88) | cards, inputs, header |
| `--primary` | `#E0521A` | oklch(0.623 0.188 39) | tangerine: brand panels, links, focus |
| `--primary-deep` | `#B33A0E` | oklch(0.520 0.164 37) | hover/pressed tangerine, sale accents |
| `--accent` | `#F2C545` | oklch(0.841 0.149 89) | highlight marks, accent CTA |
| `--ink` | `#1A0E08` | oklch(0.179 0.024 48) | text, dark panels, primary buttons |
| `--ink-soft` | `#3A2418` | oklch(0.285 0.040 49) | secondary text |
| `--line` | color-mix 14% ink in bg | | hairline borders |
| Status greens/reds | derived, low chroma, warm-tinted | | success / danger, never neon |

Rules: no pure #000/#fff anywhere; neutrals are warm-tinted. Tangerine is Committed (carries hero panels and brand moments); task screens stay Restrained with tangerine only on primary state/selection.

## Typography

| Face | Loaded as | Use |
| --- | --- | --- |
| Bricolage Grotesque | `next/font/google`, weights 500-800 | display headlines, section titles, wordmark |
| Inter | `next/font/google`, 400-650 | body, forms, tables |
| JetBrains Mono | `next/font/google`, 400-700 | prices, SKUs, counts, uppercase kicker labels, statuses |

- Display scale is fluid (`clamp`), ratio ≥1.25; body is fixed rem.
- Headlines: tight leading (0.95-1.02), tracking -0.02em to -0.04em, sentence case ending with a period (editorial voice).
- Kicker labels: JetBrains Mono, uppercase, 0.72-0.78rem, letter-spacing 0.08-0.14em, ink-soft or tangerine.
- Body line length ≤72ch.

## Signature elements

- **Highlight mark**: one word in a display headline wrapped in `.mark` — accent-yellow box (`#F2C545`), slight padding, no rotation. Max one per headline.
- **Ink panel**: dark `#1A0E08` rounded panel with cream text (order summary, footer band).
- **Pill buttons**: fully rounded. Primary = ink bg / cream text; secondary = 1px warm border on surface; accent = gold bg / ink text; danger = outline red. Active state scales to 0.97 on pointer-down.
- **Chips**: pill toggles for sizes/colors/filters; selected chip = ink bg cream text. Colour chips carry a 12px swatch dot when the name is a known colour.
- **Floating material** (stylist launcher): translucent cream (`--surface` 84%) + `backdrop-filter`, a bright inset top edge and a two-layer shadow so it separates from cream, ink and photos alike. Never the plain ink button — it vanishes over ink panels.

(The home hero "tangerine panel" and the marquee strip were removed in the portfolio reframe; their CSS is gone too. `.headline` stays as the top step of the type scale.)

## Components

- Cards: `--surface` bg, 1px `--line` border, radius 16px, shadow only on hover-elevate (product cards).
- Inputs/selects/textareas: surface bg, 1px line border, radius 12px, focus ring = 2px tangerine outline offset 2px; labels above, mono-kicker style.
- Tables: borderless container, hairline row dividers, mono numerals; header = mono uppercase kicker.
- Status badges: mono lowercase pill with dot, tinted per state (paid/success green-warm, pending gold, cancelled/failed red-warm, neutral ink).
- Skeletons: shimmer on warm tint, shaped to final layout.
- Empty states: headline + one-line body + single CTA, no nested page containers.

## Motion

- Transitions only on `transform`, `opacity`, `background-color`, `border-color`, `box-shadow`; never `all`.
- Durations 120-250ms, `cubic-bezier(0.23, 1, 0.32, 1)` (strong ease-out).
- Feedback on pointer-down, never only on release: buttons/chips/nav links/product cards all have an `:active` scale.
- Product-card hover: translateY(-3px) + shadow, gated behind `(hover: hover) and (pointer: fine)`.
- Entrances via `@starting-style` fade/rise where cheap; no page-load choreography on task screens.
- **Surfaces originate from their trigger and leave the same way.** The stylist panel scales/rises out of the launcher (`transform-origin: 100% 100%`) and exits along the same path via `transition-behavior: allow-discrete` on `display`; on phones it is a bottom sheet that rises from the bottom edge.
- **Gesture-driven motion uses springs, not durations.** The sheet's drag-to-dismiss (`src/lib/motion/spring.ts`, `useSheetDismiss`) tracks the finger 1:1 from the grab point, rubber-bands above its rest position, projects the release velocity (`decelerationRate 0.998`) to choose snap-back vs dismiss, and hands that velocity to a spring (`response 0.35s`, damping 0.85 on return, 1.0 on dismiss). A grab mid-spring takes over from the on-screen value.
- **Data does not jump.** Cart quantity and removal update the cache optimistically (taps 1:1, the write is debounced 350ms); catalog filters apply on change with `keepPreviousData`, the old grid dims instead of collapsing into skeletons.
- Sticky header: no permanent divider — a scroll-edge shadow appears only once content passes underneath (`data-scrolled` from an IntersectionObserver sentinel).
- `prefers-reduced-motion`: springs and slides become cross-fades; feedback (colour, opacity, the 0.97 press) stays. `prefers-reduced-transparency` makes the header/launcher solid `--surface`; `prefers-contrast: more` swaps hairlines for ink borders.

## Forgiveness

- Reversible slips get **undo**, not a dialog: removing a cart line or wishlist entry shows an inline "Removed “X” · Undo" notice for 6s.
- Irreversible actions (cancel order, delete product/category/review/address/image) use the **two-step inline confirm** (`ConfirmButton`): the first click arms the control in place next to a "Keep" escape; Escape/blur/6s disarms. No modals.

## Touch

- Minimum target 44px on `(pointer: coarse)` (`--tap`): buttons, chips, nav links, quantity steppers, the launcher.
- Mobile header: the utility row (language, sign in/register) scrolls away; only brand + nav stay pinned (~58px of chrome, not two rows).
- The stylist input is not auto-focused on touch (no keyboard over the quick prompts); the sheet tracks `visualViewport` so it stays above the keyboard.

## Layout

- Spacing is a 4px scale (`--space-1` 4 … `--space-8` 32); inline gaps use those steps (4/8/12/16/20/24), nothing in between.
- Page container: min(1200px, 100vw - 48px), generous vertical rhythm (sections 56-96px apart on brand moments, 24-40px on task screens).
- Asymmetry on brand moments: left-aligned display headline with offset right-column support text (reference's "Four strategies / One discipline" pattern).
- Product grid: `repeat(auto-fill, minmax(240px, 1fr))`.
- Admin: compact top tab bar, dense tables allowed.
