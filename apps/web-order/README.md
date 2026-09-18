# @prato/web-order

Public diner surface — menu showcase only (React 19). No cart, no checkout, no
order tracking: the diner reads the menu and prices, and places the order with
staff in person (`web-staff`). No install, no PWA. Same Avenir Angular project
convention; its `core/` has **no auth.service** and no session store — the app
is stateless, anonymous, read-only.

```bash
pnpm install
pnpm dev        # http://localhost:1020  (proxies /api → :3000)
```

## Routes
| Path | Screen | Guard |
|------|--------|-------|
| `/menu` | Menu showcase (items, prices, promotions) | public |
| `/d/$slug` | Brand-scoped menu showcase | public |

Any other path redirects to `/menu`.
