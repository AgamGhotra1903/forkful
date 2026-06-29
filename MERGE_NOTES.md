# Merge Notes — forkful-main UI + Final 3 feature polish

This build is **forkful-main** (your preferred colour scheme / iOS-glass look — same
files you saw in the screenshots) as the base, with the genuinely good, additive
improvements from **Final 3** merged back in. Nothing about the orange/dark colour
system, fonts, radii, or the hero background photo was changed.

## The actual bug ("text submerging into background")
`index.css` never told Tailwind v4 to key its `dark:` classes off the app's `.dark`
class — by default Tailwind v4 keys `dark:` off the OS `prefers-color-scheme`
media query. So any element using `dark:text-*` could end up using the *light*
text colour while the page was actually dark (because the OS theme and the
in‑app toggle disagreed), which reads as text fading into the background.

**Fix applied:** added one line near the top of `index.css`:
```css
@custom-variant dark (&:where(.dark, .dark *));
```
This makes `dark:` follow the same `.dark` class your `ThemeContext` already
toggles, app-wide — not just on the couple of spots Final 3 had patched by hand.

## Files merged in from Final 3 (polish/fixes only, same colour tokens throughout)
- `index.css` — appended Final 3's extra utility classes (`noise-overlay`,
  `glow-orange`, `gradient-border`, `pill-tabs`/`pill-tab`, `section-eyebrow`,
  `glow-divider`, `skeleton-shimmer`, `text-gradient-orange`, `input-focus-ring`,
  `stat-card`) on top of the unchanged original token set.
- `components/ui.tsx` — status pill colours switched from light-mode pastel
  hex values to theme-aware `rgba()` + a small coloured dot, so status badges
  stay legible in dark mode; skeleton loaders now use the shimmer animation.
- `components/navbar.tsx` — refined hover states on the theme toggle, cart
  badge glow, gradient text on active links. Same logo, same orange, same layout.
- `components/OrderStatusStepper.tsx` — completed steps now show green
  (`--color-signal`) instead of orange, so "done" and "in progress" read
  differently at a glance.
- `components/MenuItems.tsx` — bigger veg/non‑veg dot, gradient-border on
  item cards, glow on the Add button.
- `pages/Home.tsx`, `pages/RestaurantPage.tsx`, `pages/Cart.tsx`,
  `pages/Checkout.tsx`, `pages/OrderPage.tsx`, `pages/OrderSuccess.tsx`,
  `pages/Orders.tsx`, `pages/PaymentSuccess.tsx` — section-eyebrow headers,
  hover/glow states on buttons, skeleton loading states, surge-pricing badge
  and payment-method selection highlight on Checkout, and (the important one)
  the restaurant page's tab switcher and diet-filter chips were rewritten to
  use the same `var(--color-*)` tokens as everything else instead of raw
  `dark:` Tailwind classes — this is the other half of the contrast fix.

## Deliberately NOT taken from Final 3
- `components/auth/AuthDecorativePanel.tsx` — Final 3 had recoloured the
  login panel from the orange/coral gradient to a navy/indigo gradient. That's
  the one real visual regression I found, so this file is kept 100% as it was
  in forkful-main (orange gradient, matches your screenshots exactly).

Everything else (all 5 backend services, Docker/nginx config, auth flow,
Login.tsx, App.tsx, routing, types) is untouched forkful-main — it was already
identical between the two zips.

## Running it locally
```bash
# from the project root
./setup.sh        # or follow SETUP.md
./start-all.sh
```
The frontend's `node_modules` was intentionally removed before zipping (it's
huge and platform-specific) — run `npm install` inside `frontend/` (and inside
each `services/*` folder, or use the root `setup.sh`) before starting.
