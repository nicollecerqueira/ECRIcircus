import { useNavigate, useSearch } from '@tanstack/react-router';
import { type ReactNode, useState } from 'react';
import { Art } from '../../shared/components/art';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import {
  accountLabel,
  isActiveOrder,
  isOnAccount,
  ORDER_STATUS_LABEL,
  type Order,
  orderTotalCents,
  teamLabel,
} from '../order/order.model';
import { useCreateOrder, useOrders } from '../order/order.service';
import type { Table } from './floor.model';
import { useTables } from './floor.service';
import { TEAMS } from './teams';

/**
 * Chaves de seleção que NÃO são o nome de uma equipe. Ambas começam com `*`,
 * que nenhuma equipe usa, para não colidirem com uma equipe de verdade vinda do
 * banco (a lista é texto livre na API, não enum).
 */
const ALL_TEAMS = '*todas';
const NO_TEAM = '*sem-equipe';

/** Conta recém-aberta ainda não tem item: o balcão precisa ver isso de relance. */
function itemSummary(order: Order): string {
  const items = order.items.filter((i) => i.state !== 'voided');
  if (items.length === 0) {
    return 'Sem itens ainda';
  }
  const count = items.reduce((n, i) => n + i.qty, 0);
  return `${count} ${count === 1 ? 'item' : 'itens'}`;
}

type TeamGroup = { key: string; label: string; orders: Order[] };

/**
 * Agrupa as contas abertas por equipe.
 *
 * Só entram equipes que TÊM conta aberta: a lista existe para achar uma conta
 * rápido, e equipes vazias só empurrariam as que interessam para baixo. Contas
 * sem equipe (pedidos legados de mesa, ou vindos do app antes do campo existir)
 * caem num grupo próprio no fim — some-las esconderia conta viva da operação.
 */
function groupByTeam(orders: Order[]): TeamGroup[] {
  const groups = new Map<string, TeamGroup>();
  for (const order of orders) {
    const name = order.teamName?.trim();
    const key = name || NO_TEAM;
    const group = groups.get(key);
    if (group) {
      group.orders.push(order);
    } else {
      groups.set(key, { key, label: name || 'Sem equipe', orders: [order] });
    }
  }
  return [...groups.values()].sort((a, b) => {
    // "Sem equipe" é sempre o último: é exceção, não uma equipe entre as outras.
    if (a.key === NO_TEAM) {
      return 1;
    }
    if (b.key === NO_TEAM) {
      return -1;
    }
    return a.label.localeCompare(b.label, 'pt-BR');
  });
}

/**
 * Abrir conta. Ao criar, vai DIRETO para o pedido — o balcão abre a conta porque
 * já tem alguém na frente pedindo, então parar numa lista no meio do caminho só
 * custa um toque a mais com a fila esperando. O formulário some junto, porque a
 * tela inteira sai de cena.
 *
 * `defaultTeam` vem da equipe que está sendo vista: quem está na lista da
 * BANDINHA quase sempre abre conta da BANDINHA, e repetir a seleção a cada conta
 * é o tipo de digitação que a tela pode adivinhar.
 */
function NewAccountForm({ defaultTeam, onDone }: { defaultTeam?: string; onDone: () => void }) {
  const [name, setName] = useState('');
  const [team, setTeam] = useState(defaultTeam ?? '');
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  // Os dois campos são obrigatórios: a conta É a pessoa, e a equipe é o que
  // desempata homônimos. Abrir sem eles produziria contas anônimas que ninguém
  // consegue casar com quem está no balcão esperando.
  const canSubmit = name.trim().length > 0 && team.length > 0;

  const submit = () => {
    if (!canSubmit) {
      return;
    }
    createOrder.mutate(
      { channel: 'counter', customerName: name.trim(), teamName: team },
      {
        onSuccess: (order) =>
          // A equipe vai junto para o "Voltar ao salão" cair na lista dela.
          navigate({ to: '/order/$id', params: { id: order.id }, search: { team } }),
      },
    );
  };

  return (
    <Card className="mb-4">
      <p className="mb-3 font-semibold">Abrir nova conta</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium">Nome completo</span>
          <input
            type="text"
            value={name}
            autoComplete="off"
            placeholder="Ex.: Nicolle Cerqueira"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submit();
              }
            }}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          />
        </label>

        <label className="min-w-48 flex-1">
          <span className="mb-1 block text-sm font-medium">Equipe</span>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
          >
            <option value="">Selecione…</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={!canSubmit || createOrder.isPending}>
            {createOrder.isPending ? 'Abrindo…' : 'Abrir conta'}
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </div>
      {createOrder.isError && (
        <p className="mt-2 text-sm text-danger">Não foi possível abrir a conta.</p>
      )}
    </Card>
  );
}

/** Etapa 1: qual equipe. Cada cartão já diz quantas contas há dentro, para o
    balcão saber onde procurar antes de entrar. */
function TeamPicker({
  groups,
  total,
  onPick,
}: {
  groups: TeamGroup[];
  total: number;
  onPick: (key: string) => void;
}) {
  return (
    <>
      <p className="mb-3 text-sm text-muted">Escolha a equipe para ver as contas abertas dela.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            className="text-left"
            onClick={() => onPick(group.key)}
          >
            <Card className="h-full transition hover:border-primary">
              <span className="line-clamp-2 text-base font-bold uppercase leading-tight tracking-wide text-accent">
                {group.label}
              </span>
              <p className="mt-2 text-sm text-muted">
                {group.orders.length} {group.orders.length === 1 ? 'conta' : 'contas'}
              </p>
            </Card>
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button variant="ghost" onClick={() => onPick(ALL_TEAMS)}>
          Ver todas as contas ({total})
        </Button>
      </div>
    </>
  );
}

/** Cartão de uma conta na etapa 2. */
function AccountCard({
  order,
  tables,
  onOpen,
}: {
  order: Order;
  tables: Table[] | undefined;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="text-left" onClick={onOpen}>
      <Card className="h-full transition hover:border-primary">
        <div className="flex items-start justify-between gap-2">
          {/* Nome completo cabe em duas linhas: truncar "Nicolle Cerqueira" no
              meio tira justamente o que identifica a conta. */}
          <span className="line-clamp-2 text-lg font-bold leading-tight">
            {/* Pedidos anteriores à mudança ainda são de mesa: mostrar
                "Conta #a1b2c3d4" para eles esconderia a única coisa que
                os identifica, que é o número da mesa. */}
            {order.tableId
              ? `Mesa ${tables?.find((t) => t.id === order.tableId)?.number ?? '?'}`
              : accountLabel(order)}
          </span>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge tone="accent">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
            {isOnAccount(order) && <Badge tone="danger">na conta</Badge>}
          </div>
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent">
          {teamLabel(order)}
        </p>
        <p className="mt-2 text-sm text-muted">{itemSummary(order)}</p>
        <p className="mt-1 font-semibold">{formatCents(orderTotalCents(order))}</p>
      </Card>
    </button>
  );
}

/**
 * Contas abertas — a tela inicial do salão.
 *
 * Substituiu o mapa de mesas: sem QR de mesa, a unidade de trabalho passou a ser
 * a conta da PESSOA. Cada cartão é um pedido ainda vivo, venha ele do app do
 * cliente ou aberto aqui no balcão.
 *
 * Em duas etapas (equipe → contas) porque em dia de evento há dezenas de contas
 * abertas ao mesmo tempo: uma grade única obrigaria a varrer a tela inteira, e a
 * equipe é justamente como o balcão sabe de quem é a conta.
 *
 * A equipe escolhida vive na URL (`/floor?team=…`), não em estado local: assim
 * voltar do detalhe do pedido devolve a lista da MESMA equipe, que é para onde a
 * pessoa estava olhando.
 */
export function FloorComponent() {
  const { data: orders, isPending, isError } = useOrders();
  // Só para rotular pedidos legados de mesa (ver o cartão acima).
  const { data: tables } = useTables();
  const [opening, setOpening] = useState(false);
  const navigate = useNavigate();
  const { team: selected } = useSearch({ strict: false }) as { team?: string };

  const selectTeam = (key: string | undefined) => navigate({ to: '/floor', search: { team: key } });

  if (isPending) {
    return <Spinner />;
  }
  if (isError) {
    return <p className="p-6 text-danger">Falha ao carregar as contas.</p>;
  }

  const open = orders.filter(isActiveOrder);
  const groups = groupByTeam(open);
  const group = selected ? groups.find((g) => g.key === selected) : undefined;
  const showingAll = selected === ALL_TEAMS;
  const listed = showingAll ? open : (group?.orders ?? []);

  // Quatro estados excludentes (nada aberto / escolher equipe / equipe vazia /
  // a lista). Em cadeia de ternários dentro do JSX ninguém enxerga qual ramo
  // está lendo — aqui cada um se anuncia pela condição que o liga.
  let body: ReactNode;
  if (open.length === 0) {
    body = (
      <div className="py-10 text-center">
        <Art name="popcornBucket" size="lg" fallback="🍿" className="mb-2" />
        <p className="text-muted">Nenhuma conta aberta no momento.</p>
      </div>
    );
  } else if (!selected) {
    body = <TeamPicker groups={groups} total={open.length} onPick={selectTeam} />;
  } else if (listed.length === 0) {
    // A última conta da equipe pode ter sido fechada em outro terminal enquanto
    // esta tela estava aberta — o link continua válido, a lista é que esvaziou.
    body = (
      <div className="py-10 text-center">
        <p className="text-muted">Nenhuma conta aberta nesta equipe.</p>
        <Button className="mt-3" variant="ghost" onClick={() => selectTeam(undefined)}>
          ← Ver as equipes
        </Button>
      </div>
    );
  } else {
    body = (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {listed.map((order) => (
          <AccountCard
            key={order.id}
            order={order}
            tables={tables}
            onOpen={() =>
              navigate({ to: '/order/$id', params: { id: order.id }, search: { team: selected } })
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Art name="tent" size="sm" fallback="🎪" />
          <div>
            <h1 className="circus-wordmark text-xl font-bold">Contas abertas</h1>
            {selected && (
              <p className="text-sm font-semibold uppercase tracking-wide text-accent">
                {showingAll ? 'Todas as equipes' : (group?.label ?? selected)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {selected && (
            <Button variant="ghost" onClick={() => selectTeam(undefined)}>
              ← Trocar equipe
            </Button>
          )}
          {!opening && <Button onClick={() => setOpening(true)}>+ Abrir nova conta</Button>}
        </div>
      </div>

      {opening && (
        // `*todas` e `*sem-equipe` não são equipe: só serve de sugestão o que a
        // pessoa pode de fato querer repetir.
        <NewAccountForm
          defaultTeam={selected && !selected.startsWith('*') ? selected : undefined}
          onDone={() => setOpening(false)}
        />
      )}

      {body}
    </div>
  );
}
