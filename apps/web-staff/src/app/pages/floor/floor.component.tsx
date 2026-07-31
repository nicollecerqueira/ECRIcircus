import { useNavigate } from '@tanstack/react-router';
import { Art } from '../../shared/components/art';
import { Badge, Card, Spinner } from '../../shared/components/ui';
import { STATUS_LABEL, STATUS_TONE, type Table } from './floor.model';
import { useOpenSession, useTables } from './floor.service';

export function FloorComponent() {
  const { data: tables, isPending, isError } = useTables();
  const openSession = useOpenSession();
  const navigate = useNavigate();

  if (isPending) {
    return <Spinner />;
  }
  if (isError) {
    return <p className="p-6 text-danger">Falha ao carregar o salão.</p>;
  }

  const onTable = (t: Table) => {
    if (t.status === 'open') {
      openSession.mutate(t.id, {
        onSuccess: () => navigate({ to: '/floor/table/$id', params: { id: t.id } }),
      });
    } else {
      navigate({ to: '/floor/table/$id', params: { id: t.id } });
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* A arte fica no cabeçalho, não escondida num estado vazio que quase
          nunca acontece — do contrário ninguém chega a vê-la. */}
      <div className="mb-4 flex items-center gap-3">
        <Art name="tent" size="sm" fallback="🎪" />
        <h1 className="circus-wordmark text-xl font-bold">Salão</h1>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {tables.map((t) => (
          <button key={t.id} type="button" onClick={() => onTable(t)} className="text-left">
            <Card className="transition hover:border-primary">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Mesa {t.number}</span>
                <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted">{t.seats} lugares</p>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
