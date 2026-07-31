import { useNavigate } from '@tanstack/react-router';
import { Art } from '../../shared/components/art';
import { Screen, Spinner } from '../../shared/components/ui';
import { useStations } from './station.service';

export function StationPickerComponent() {
  const { data: stations, isPending } = useStations();
  const navigate = useNavigate();

  if (isPending) {
    return <Spinner />;
  }

  return (
    <Screen>
      <div className="mb-6 flex items-center gap-4">
        <Art name="tent" size="md" fallback="🎪" />
        <div>
          <p className="circus-wordmark text-sm font-bold">ECRI Circus · Cozinha</p>
          <h1 className="text-2xl font-bold">Escolha a estação</h1>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(stations ?? []).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate({ to: '/station/$id', params: { id: s.id } })}
            className="circus-card rounded-2xl border border-border bg-surface p-8 text-left text-2xl font-bold transition hover:border-primary"
          >
            {s.name}
            <span className="mt-2 block text-sm font-normal text-muted">{s.kind}</span>
          </button>
        ))}
      </div>
    </Screen>
  );
}
