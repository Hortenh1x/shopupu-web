# Product

## Register

product

(Home hero and section headline moments lean brand: editorial display type, drenched tangerine panels. Task screens — catalog, cart, checkout, profile, admin — stay product register.)

## Users

Online clothing shoppers browsing on desktop and mobile: they scan the catalog, compare variants (size/color), check availability and reviews, and check out quickly as guests or account holders. Secondary users: shop staff (ADMIN/MANAGER) running products, orders, moderation and promos from the /admin area in long working sessions.

## Product Purpose

shopupu-web is the storefront for the shopupu clothing-shop API: search and filters, variant-aware product pages, guest carts with merge-on-login, idempotent checkout with promo codes and payment polling, self-service profile/GDPR, and a full admin back office. Success = shoppers find and buy clothes without friction, staff manage the shop without leaving the browser.

## Brand Personality

Warm, editorial, assured. The shop reads like a well-set seasonal catalog printed on cream paper: oversized confident headlines, tangerine warmth, mono-set prices and SKUs like a price list from a good print shop. Never sterile, never neon, never "techy dashboard".

## Anti-references

- The previous shopupu look: dark grey "concrete brutalism", terminal monospace headlines, inverted color naming. That is what we are replacing.
- Finance content from the Tangerine Capital reference (tickers about IRR, "allocators", fund language). We borrow its visual system, not its subject matter.
- Generic SaaS landing patterns: gradient text, glassmorphism cards, neon glows, hero-metric blocks.
- Fast-fashion clutter: flashing discount stickers, countdown timers, dense promo banners.

## Design Principles

1. Editorial confidence: one oversized statement per screen; everything else steps back.
2. Print-shop clarity: prices, SKUs, counts and statuses are set in mono and always scannable.
3. Warmth carries the brand: cream surfaces and tangerine accents do the identity work; components stay familiar and boring in the best way.
4. The task disappears into the flow: standard controls, visible state (loading, empty, error) on every screen, no invented affordances.
5. Guest-first commerce: nothing assumes an account until checkout requires one.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast on text and controls (ink on cream, cream on tangerine/ink panels are checked pairs).
- All motion under 300ms, `prefers-reduced-motion` respected, hover effects gated behind `(hover: hover)`.
- Real `<img>` elements with alt text for product imagery; forms with visible labels; focus states never removed.
