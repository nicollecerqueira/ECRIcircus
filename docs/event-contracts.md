# Event contracts (real-time spine)

The order→kitchen→payment loop is event-driven over a Socket.IO gateway with a
Redis adapter. Socket messages **invalidate React Query caches** on the client —
they never carry the source of truth. REST is the single read model.

## Rooms
| Room | Who joins | Purpose |
|------|-----------|---------|
| `tenant:{t}:location:{l}:kds:{station}` | KDS screens | Items routed to a station |
| `tenant:{t}:location:{l}:order:{orderId}` | waiter / QR / POS | Followers of one order |

Every subscribe is validated against the socket's token scope. A subscribe whose
`tenantId`/`locationId` doesn't match the room is rejected.

## Events
Every payload carries `tenantId` and `locationId`.

| Event | Direction | Payload (shape) | Notes |
|-------|-----------|-----------------|-------|
| `item.fired` | server → KDS | `{ tenantId, locationId, stationId, orderId, itemId, name, qty, notes? }` | New item to cook |
| `item.preparing` | server → order followers | `{ tenantId, locationId, orderId, itemId }` | Cook started |
| `item.ready` | server → order followers | `{ tenantId, locationId, orderId, itemId }` | Cook finished |
| `order.updated` | server → order followers | `{ tenantId, locationId, orderId, status }` | Add/void item, status change |
| `order.paid` | server → POS + waiter | `{ tenantId, locationId, orderId }` | Table can be freed |

## Client reaction (React Query invalidation map)
| Event | Invalidates |
|-------|-------------|
| `item.fired` | `['kds', stationId]` |
| `item.preparing` / `item.ready` | `['order', orderId]`, `['kds', stationId]` |
| `order.updated` | `['order', orderId]`, `['orders']` |
| `order.paid` | `['order', orderId]`, `['orders']`, `['floor']` |

## Reconnect protocol
On drop: show a subtle "reconnecting" badge, keep last data, resubscribe rooms,
then invalidate the relevant query keys to resync.
