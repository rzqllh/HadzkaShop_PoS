# Design System — Hadzka Shop POS

> Referenced by every agent before generating any UI. If it's not written here, it's not allowed. Read this file before any UI work.

## Design Read

**Reading this as:** operational cashier cockpit for a single-outlet Indonesian retail shop, with a functional/utilitarian language, leaning toward shadcn/ui + Tailwind v4 + minimal motion. This is closer to a cockpit than a landing page — speed, large touch targets, and error-tolerance over visual flourish.

## Dials (per design-taste-frontend)

| Dial | Value | Rationale |
|------|-------|-----------|
| `DESIGN_VARIANCE` | 3 | Consistency over novelty. Cashiers need predictability. |
| `MOTION_INTENSITY` | 2 | Almost static. Motion only for state feedback (payment success, error shake). No scroll animations, no reveals. |
| `VISUAL_DENSITY` | 7 | High density — cashier needs products, cart, and payment controls visible simultaneously without scrolling. |

## Direction

A **functional instrument panel**, not a marketing page. The design must:
- Let a cashier complete a sale in under 10 seconds (scan/search → add → pay → receipt).
- Work on a 10-14" touchscreen tablet AND a desktop browser.
- Remain legible and usable after 8 hours of continuous use (low eye strain, high contrast, no decorative motion).
- Survive fat-finger errors gracefully (large tap targets, confirmation before destructive actions).

This should NOT look like:
- A SaaS dashboard with analytics widgets and gradient hero sections.
- A glassmorphism showcase.
- A consumer e-commerce checkout flow.
- An admin template with 50 sidebar links.

Reference vibe: Square POS, Loyverse, iZettle — dense, functional, high-contrast tools.

## Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#FAFAFA` | Main background (light mode) |
| `--background-dark` | `#0F0F0F` | Main background (dark mode — for night shifts) |
| `--surface` | `#FFFFFF` | Cards, panels, modals |
| `--surface-dark` | `#1A1A1A` | Cards in dark mode |
| `--foreground` | `#0F172A` | Primary text (slate-900) |
| `--foreground-dark` | `#F1F5F9` | Primary text in dark mode |
| `--muted` | `#64748B` | Secondary text (slate-500) |
| `--border` | `#E2E8F0` | Borders, dividers |
| `--primary` | `#2563EB` | Primary actions, selected states (blue-600) |
| `--primary-hover` | `#1D4ED8` | Primary hover state |
| `--success` | `#16A34A` | Completed payments, stock OK (green-600) |
| `--warning` | `#D97706` | Low stock alerts, pending states (amber-600) |
| `--danger` | `#DC2626` | Errors, void/cancel, critical alerts (red-600) |
| `--accent-cash` | `#16A34A` | Cash payment button — green = money |
| `--accent-qris` | `#2563EB` | QRIS payment button — blue = digital |

**Palette rules:**
- Neutral base (slate). One accent color (`--primary` blue) for interactive states.
- Green and red are semantic only — success/money and error/danger. Never decorative.
- No purple gradients, no neon accents, no AI-aesthetic colors.
- Warm and cool grays are not mixed — use the slate scale consistently.
- Dark mode is supported from day one (cashiers working evening/night shifts). Use `dark:` variant in Tailwind.

## Typography

| Style | Font | Size | Weight | Line-height | Usage |
|-------|------|------|--------|-------------|-------|
| **Display** | Geist Sans | 28px / `text-2xl` | 700 | 1.2 | Page titles (rare — POS is mostly functional, not headline-heavy) |
| **Section** | Geist Sans | 20px / `text-xl` | 600 | 1.3 | Section headers (Cart, Products, Reports) |
| **Body** | Geist Sans | 16px / `text-base` | 400 | 1.5 | Default text, product names, labels |
| **Body Large** | Geist Sans | 18px / `text-lg` | 500 | 1.4 | Cart item names, totals |
| **Price** | Geist Mono | 18px / `text-lg` | 600 | 1.2 | All currency amounts — monospace for column alignment |
| **Price Large** | Geist Mono | 28px / `text-2xl` | 700 | 1.1 | Transaction total, change due |
| **Caption** | Geist Sans | 13px / `text-xs` | 400 | 1.4 | Timestamps, secondary info, stock counts |
| **Button** | Geist Sans | 15px | 500 | 1.0 | Button labels |

**Font rules:**
- Geist Sans for all UI text. Geist Mono for all currency/number displays (aligned columns).
- Load via `next/font` (local), not Google Fonts CDN link.
- No serif fonts anywhere. This is a tool, not editorial content.
- No Inter (too generic), no Rubik, no display fonts.

## Spacing

- **Base unit:** 4px (`--spacing-unit: 0.25rem`)
- **Scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Component gap:** 8px (within components), 16px (between components), 24px (between sections).
- **Page padding:** 16px on mobile, 24px on tablet/desktop.
- **Touch target minimum:** 44px × 44px (WCAG 2.5.5). Product grid buttons, cart actions, payment buttons all respect this.

## Components

### Shape
- **Border-radius:** 8px for cards/panels (`rounded-lg`), 6px for buttons/inputs (`rounded-md`), 9999px for pills/badges (`rounded-full`).
- **Shape consistency:** All-soft system. No mixing sharp and rounded.

### Elevation
- **Shadow (subtle):** `0 1px 2px rgba(0,0,0,0.05)` — for cards that need slight lift.
- **Shadow (elevated):** `0 4px 6px -1px rgba(0,0,0,0.1)` — for modals, dropdowns.
- **No decorative shadows.** Shadows communicate elevation hierarchy only.

### Interactive States
| State | Treatment |
|-------|-----------|
| **Hover** | Background tint shift (`bg-primary/10` or `bg-muted/10`). No scale transforms — they cause layout jank in dense UIs. |
| **Active/Pressed** | `scale-[0.98]` + slight darken. Brief — 100ms. |
| **Focus** | `ring-2 ring-primary ring-offset-2`. Always visible for keyboard nav. |
| **Disabled** | `opacity-50 cursor-not-allowed`. No pointer events. |
| **Selected** | `border-primary bg-primary/5` (for product grid selection). |
| **Loading** | Inline spinner next to button text. Button stays the same size. No skeleton loaders for POS actions — too slow a mental model for a cashier. |
| **Error** | `border-danger` + inline error text below the input. Toast for transient errors (payment failed). |
| **Success** | Brief green flash on the total area when payment completes. Auto-dismiss in 2s. |

## Motion

- **Duration (fast):** 100ms — button press, state toggles.
- **Duration (standard):** 200ms — modal open/close, toast appear.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out for enters), `ease-in` for exits.
- **No scroll-driven animation.** No parallax. No stagger reveals. No marquees.
- **Reduced motion:** All motion collapses to instant under `prefers-reduced-motion: reduce`.
- **Allowed motion:** Payment success indicator (brief green pulse), error shake (brief horizontal shake on the total), modal fade in/out, toast slide in. That's it.

## Layout — POS Screen (Primary Interface)

The main POS screen is a **two-panel layout** optimized for the cashier workflow:

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Shop name │ Cashier name │ Till status │ Settings  │
├──────────────────────────────┬──────────────────────────────┤
│                              │                              │
│  PRODUCT PANEL (60%)         │  CART PANEL (40%)            │
│                              │                              │
│  ┌──────────────────────┐    │  ┌──────────────────────┐    │
│  │ Search / Category bar │   │  │ Cart items list       │    │
│  └──────────────────────┘    │  │ (scrollable)          │    │
│                              │  │                        │   │
│  ┌────┐ ┌────┐ ┌────┐       │  │ Product  Qty  Price   │    │
│  │Prod│ │Prod│ │Prod│       │  │ ──────── ───  ─────   │    │
│  │ 1  │ │ 2  │ │ 3  │       │  │                        │   │
│  └────┘ └────┘ └────┘       │  ├──────────────────────┤    │
│  ┌────┐ ┌────┐ ┌────┐       │  │ Subtotal              │    │
│  │Prod│ │Prod│ │Prod│       │  │ Discount  [input]     │    │
│  │ 4  │ │ 5  │ │ 6  │       │  │ Tax/PPN               │    │
│  └────┘ └────┘ └────┘       │  │ ─────────────────     │    │
│                              │  │ TOTAL      Rp xxx     │    │
│  (grid, scrollable)          │  ├──────────────────────┤    │
│                              │  │ [💵 CASH]  [📱 QRIS]  │    │
│                              │  │ (large payment btns)   │   │
│                              │  └──────────────────────┘    │
└──────────────────────────────┴──────────────────────────────┘
```

### Responsive behavior
| Viewport | Layout |
|----------|--------|
| Desktop (≥1024px) | Two-panel side-by-side: 60% products / 40% cart |
| Tablet (768-1023px) | Two-panel with narrower product grid (fewer columns) |
| Mobile (<768px) | Stacked — product grid on top, cart slides up from bottom as a sheet. Tab bar for navigation. |

### Product grid
- Cards: product image (or placeholder initial), name, price. Large tap target (min 80×80px).
- Grid columns: 4-5 on desktop, 3 on tablet, 2-3 on mobile.
- Category tabs along the top of the product panel for quick filtering.
- Search bar always visible at the top.

### Cart panel
- Sticky on the right side (desktop/tablet). Always visible — cashier should never lose sight of the cart.
- Each cart item: name, quantity stepper (−/+), line total, remove button.
- Discount and tax inputs at the bottom, above totals.
- Payment buttons are the largest interactive elements on the screen (min 56px height).

## Admin/Owner Pages

- Standard sidebar layout (shadcn Sidebar component).
- Left sidebar: Products, Reports, Users, Settings, Till History.
- Content area: responsive, max-width 1280px.
- Tables for data (products list, transaction history) using shadcn Table.
- Forms use shadcn form patterns (FieldGroup + Field, label above input, error below).

## Explicitly Banned

Patterns that agents keep defaulting to that are wrong for this product:

- ❌ Purple-to-blue gradients (AI aesthetic, not a POS tool)
- ❌ Glassmorphism / backdrop-blur on functional panels (readability killer under harsh store lighting)
- ❌ Emoji as icons (use Lucide icons via shadcn — already bundled)
- ❌ Unmodified shadcn defaults without POS-appropriate sizing
- ❌ Skeleton loaders for primary POS actions (too slow — use inline spinners)
- ❌ Scroll-driven animations, parallax, marquees
- ❌ Hero sections, feature grids, testimonial sections (this is a tool, not marketing)
- ❌ Light-on-light text (slate-300 on white background)
- ❌ Cards with decorative left-border accent color
- ❌ Scale transforms on hover in the product grid (causes layout jank)
- ❌ Serif fonts anywhere
- ❌ Inter font (too generic — use Geist)
- ❌ Custom SVG illustrations or hand-drawn icons
- ❌ Toast notifications for successful sales (use inline success state — toasts are easy to miss during rapid-fire transactions)
