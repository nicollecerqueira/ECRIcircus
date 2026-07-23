# deploy/

Container + cloud manifests + reverse-proxy config.

- Images: `ghcr.io/avenirdesenvolvimentos/prato-{api,staff,kds,order}:<sha>` / `:latest`
- Target: cloud, managed containers behind a load balancer (provider TBD).
- Per-tenant custom subdomain (`<brand>.prato.app`) resolved at the proxy → routed
  to `web-staff` / `web-order` by host + path; `/api` and `/realtime` → `api`.

## Files
- `Caddyfile` — reverse-proxy sketch (TLS, host routing, WebSocket upgrade for `/realtime`).
