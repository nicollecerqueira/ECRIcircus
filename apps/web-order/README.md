# @prato/web-order

Public diner surface — QR self-order + delivery storefront (React 19). No install,
no PWA, hostile-input-facing. Same Avenir Angular project convention; its `core/`
has **no auth.service** — a `session.store.ts` holds the diner's table token.

```bash
pnpm install
pnpm dev        # http://localhost:5175  (proxies /api and /realtime → :3000)
```

## Routes
| Path | Screen | Guard |
|------|--------|-------|
| `/t/$qrToken` | Table landing — resolves the QR, opens the session | public |
| `/menu` · `/cart` | Menu + cart | table token |
| `/track/$orderId` | Live order tracking (socket-driven) | table token |
| `/d/$slug` | Delivery storefront | public |
| `/scan` | "Scan the QR" fallback | public |

Try it: open
`http://localhost:5175/t/q_22222222-2222-2222-2222-222222222222_1`
(demo QR for table 1). The seed builds the token as `q_<locationId>_<número da
mesa>`, então os tokens reais aparecem em **web-staff → Admin → Mesas** (ou em
`GET /api/v1/tables` com o JWT do garçom).
