import { Card } from '../../shared/components/ui';
import { useTables } from '../floor/floor.service';

// Thin admin surfaces — scaffolded so the routes + guards are real. Full CRUD
// (tables/QR, staff & roles, sales reports) is built out in a later phase.

export function TablesAdminComponent() {
  const { data: tables } = useTables();
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold">Mesas & QR</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(tables ?? []).map((t) => (
          <Card key={t.id}>
            <p className="font-semibold">Mesa {t.number}</p>
            <p className="text-xs text-muted">{t.seats} lugares</p>
            <p className="mt-2 break-all font-mono text-xs text-muted">QR: {t.qrToken}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function StaffAdminComponent() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold">Equipe & Papéis</h1>
      <Card>
        <p className="text-muted">
          Gestão de usuários e RBAC (brand_owner · location_manager · waiter · cashier · kitchen).
          Em construção.
        </p>
      </Card>
    </div>
  );
}

export function SalesAdminComponent() {
  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold">Vendas</h1>
      <Card>
        <p className="text-muted">Visão básica de vendas por período. Em construção.</p>
      </Card>
    </div>
  );
}
