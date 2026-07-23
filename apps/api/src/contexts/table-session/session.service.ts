import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID, TABLES } from '../../stub/seed';

type TableStatus = 'open' | 'occupied' | 'dirty';

interface Session {
  id: string;
  tableId: string;
  openedAt: string;
}

// Table & Session context. QR binding: each table has a stable qrToken that maps
// to {location, table}; scanning opens/attaches to that table's session.
@Injectable()
export class SessionService {
  private status = new Map<string, TableStatus>(TABLES.map((t) => [t.id, 'open']));
  private sessions = new Map<string, Session>(); // by tableId

  floor() {
    return TABLES.map((t) => ({
      ...t,
      status: this.status.get(t.id) ?? 'open',
      sessionId: this.sessions.get(t.id)?.id,
      // qrToken encodes {location, table} — here a deterministic stub value.
      qrToken: `q_${t.id}`,
    }));
  }

  openSession(tableId: string): Session {
    const table = TABLES.find((t) => t.id === tableId);
    if (!table) {
      throw new NotFoundException('Mesa não encontrada');
    }
    let session = this.sessions.get(tableId);
    if (!session) {
      session = { id: randomUUID(), tableId, openedAt: new Date().toISOString() };
      this.sessions.set(tableId, session);
      this.status.set(tableId, 'occupied');
    }
    return session;
  }

  /** Resolve a scanned QR token: open/attach the table session for a diner. */
  resolveQr(qrToken: string) {
    const tableId = qrToken.replace(/^q_/, '');
    const session = this.openSession(tableId);
    return {
      tenantId: DEMO_TENANT_ID,
      locationId: DEMO_LOCATION_ID,
      tableId,
      sessionId: session.id,
      // short-lived, table-scoped diner token (stub). Real impl signs a JWT.
      dinerToken: `d_${session.id}`,
    };
  }

  closeSession(tableId: string) {
    this.sessions.delete(tableId);
    this.status.set(tableId, 'dirty');
    return { tableId, status: 'dirty' as TableStatus };
  }
}
