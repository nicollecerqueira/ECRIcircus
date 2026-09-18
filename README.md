# ECRI Circus

Sistema de pedidos do evento **ECRI Circus**: a equipe lança o pedido no
balcão, ele cai na cozinha em tempo real e, no fim, a conta é acertada no
caixa. O cliente só consulta o cardápio pelo celular — quem pede é sempre a
equipe, presencialmente.

Não há mesa, não há QR code e não há carrinho do cliente — o pedido nasce no
balcão (`web-staff`), identificado por **nome e equipe**.

## Como funciona

```
CLIENTE (:1020)     BALCÃO (:1021)              COZINHA (:1022)           EQUIPE (:1021)
cardápio             abre conta                   quadro de comandas       contas abertas
(só consulta)        ↓ nome · equipe                  ↑ tempo real             ↓
                      ↓ adiciona itens           ┌───────────────┐          caixa
                      ↓ forma de pagamento  ───▶ │ 2x Hambúrguer │ ──────▶     ↓
                      pedido lançado              │    Ana Souza  │        fechamento
                                                   └───────────────┘        (itens + total)
```

**Uma conta por pessoa.** Todo pedido de quem já tem conta aberta é somado nela,
comparando o nome sem diferenciar maiúsculas nem espaços. Sem isso, cada pedido
viraria uma conta nova com o mesmo nome e o caixa cobraria pedaços soltos.

**A forma de pagamento é uma declaração, não uma cobrança.** A equipe registra
como a pessoa pretende pagar — Pix, dinheiro (com ou sem troco), cartão ou
**colocar na conta** — e quem registra o pagamento de fato é o caixa. "Na
conta" é o pedido que fica em aberto para acertar depois.

## As três aplicações

| app | porta | para quem | o que faz |
| --- | --- | --- | --- |
| `web-order` | **1020** | quem consulta | cardápio público — itens, preços e promoções, só leitura |
| `web-staff` | **1021** | equipe | abre contas, lança pedidos, contas abertas, caixa, cardápio |
| `web-kds` | **1022** | cozinha | quadro de comandas por estação, em tempo real |
| `api` | 3000 | — | REST + WebSocket (os apps chamam via proxy próprio) |

As mesmas portas valem no localhost e na VM, de propósito: o que você testa é o
endereço que a equipe vai usar.

## Estrutura ("polyrepo-in-folder" — sem workspace, apps independentes)

```
ECRIcircus/
├── apps/
│   ├── api/          NestJS 11 + MikroORM/Postgres + gateway WebSocket
│   ├── web-staff/    React 19 — contas, caixa e cardápio (PWA)
│   ├── web-kds/      React 19 — painel da cozinha (quiosque)
│   └── web-order/    React 19 — cardápio público e pedido
├── tests/e2e/        Playwright (única camada de teste)
├── tools/            orquestrador de dev + helpers de CI
├── deploy/           Caddy + compose de produção (VM)
├── docs/             tenancy · rls · event-contracts
├── docker-compose.dev.yml    só Postgres + Redis (55433 / 56380)
└── docker-compose.full.yml   stack inteira em Docker
```

Cada app React segue a **convenção Angular da Avenir**
(`core/pages/guards/shared`, `*.component/service/model`, `app.routes.ts`
central) — código React, estrutura Angular.

## Subir o projeto

**Opção A — tudo em Docker (um comando, sem Node local):**

```bash
docker compose -f docker-compose.full.yml up -d --build
```

→ cliente `:1020` · equipe `:1021` · cozinha `:1022` · API `:3000`. O nginx de
cada imagem web faz proxy de `/api` e `/realtime` para a API. **Sem hot reload**
— as imagens servem build de produção.

**Opção B — híbrido (mantém HMR, é o modelo de desenvolvimento):**

```bash
# 1) só a infra
docker compose -f docker-compose.dev.yml up -d

# 2) cada app é independente — instale por app
(cd apps/api        && cp .env.example .env && pnpm install && pnpm dev)  # :3000
(cd apps/web-order  && pnpm install && pnpm dev)                          # :1020 (cardápio)
(cd apps/web-staff  && pnpm install && pnpm dev)                          # :1021 (balcão)
(cd apps/web-kds    && pnpm install && pnpm dev)                          # :1022
```

Ou tudo de uma vez: `pnpm install && pnpm dev` na raiz (roda `tools/dev.mjs`).

## Banco

Postgres e Redis próprios do ECRI: banco/usuário **`ecri`** em `localhost:55433`,
Redis em `56380`, volumes `ecri-pgdata` / `ecri-redisdata`. As portas são
separadas de propósito, para conviver com outros projetos na mesma máquina.

As **migrations rodam sozinhas no boot da API**, antes de servir tráfego. Um
banco vazio é semeado com a marca ECRI Circus, o cardápio e as contas
`@ecricircus.app` — o seed só roda quando não existe nenhuma marca, então
alterar `*.seed.ts` não muda um banco que já rodou (para isso, use a tela
**Cardápio**).

Contas de demonstração (senha `ecri123`):

| e-mail | papel |
| --- | --- |
| `owner@ecricircus.app` | direção |
| `manager@ecricircus.app` | coordenação |
| `waiter@ecricircus.app` | balcão |
| `cashier@ecricircus.app` | caixa |
| `kitchen@ecricircus.app` | cozinha |

## Experimentar o fluxo completo

1. **Cliente** (`:1020`) → confere o cardápio, preços e promoções. Só leitura —
   quem quiser pedir procura a equipe.
2. **Equipe** (`:1021`) → login `waiter@ecricircus.app` → **Salão** → abre conta
   com **nome e equipe** → adiciona itens → registra a forma de pagamento.
3. **Cozinha** (`:1022`) → login `kitchen@ecricircus.app` → escolha a estação →
   a comanda aparece com **nome do cliente** → toque para `preparando` / `pronto`.
4. **Caixa** (`:1021/pos`) → abra a conta → o fechamento lista **item a item** o
   que foi consumido → registre o pagamento.

Lance dois pedidos com o mesmo nome: eles entram na **mesma conta**.

## Detalhes que não são óbvios pelo código

**Fichas são crédito, não comida.** A categoria `Fichas` do cardápio tem
`requiresPreparation: false`: entra na conta e no relatório de vendas, mas
**não vira comanda na cozinha**.

**As equipes são uma lista fixa no front** (`web-staff/src/app/pages/floor/teams.ts`),
usada onde o pedido nasce — no balcão.

**A cor no painel da cozinha é funcional**, não decorativa: verde → âmbar →
vermelho marcam o envelhecimento da comanda, e por isso o vermelho da marca
**não** é usado como cor primária naquela tela.

## Arquitetura e decisões técnicas

**O produto por trás do nome.** O `package.json` raiz descreve o projeto como
"Prato — multi-tenant restaurant order-to-kitchen-to-payment SaaS": por baixo
do ECRI Circus há uma plataforma pensada para várias marcas num só banco, não
um sistema feito só para este evento. Isso explica escolhas que, vistas
isoladamente para um evento único, pareceriam over-engineering — multi-tenancy,
RLS, um context `table-session` inteiro (QR de mesa) que o ECRI não usa mais.

**Multi-tenancy é invariante obrigatória, não um detalhe de implementação.**
Cada tabela de negócio carrega `tenant_id`, e o isolamento tem três camadas
redundantes de propósito (defesa em profundidade — ver
[docs/tenancy.md](docs/tenancy.md)):
1. um interceptor resolve `tenantId`/`locationId` do JWT (ou da sessão de QR) e
   guarda em `AsyncLocalStorage`;
2. um filtro global do MikroORM escopa toda query por `tenant_id` automaticamente;
3. Row-Level Security no Postgres (ver [docs/rls.md](docs/rls.md)) — hoje **provada
   mas não efetivada em produção**: a API conecta como superusuário (`ecri`), que
   contorna RLS, então essa terceira camada existe como trava pronta, não ativa.

O filtro do MikroORM é desenhado para falhar fechado: sem contexto de tenant, a
condição vira `tenant = null` e a query não devolve nada — nunca "vê tudo" por
omissão. Vazamento entre tenants é tratado como bug de severidade máxima
(comentário no código: "P0 security bug").

**Tempo real é gatilho de cache, não fonte de verdade.** O loop
pedido→cozinha→pagamento é orientado a eventos (`EventEmitter2` in-process no
backend, `DomainEvent`: `item.fired`, `item.preparing`, `item.ready`,
`order.updated`, `order.paid`) publicados via Socket.IO. O Redis adapter existe
porque a API pode rodar em várias instâncias atrás de um load balancer — sem
pub/sub compartilhado, um evento emitido numa instância nunca chegaria a um
socket conectado noutra. Mas o socket nunca carrega o dado em si: ele só avisa
o cliente para invalidar a query certa do TanStack Query, que então busca o
estado atual via REST. Ver [docs/event-contracts.md](docs/event-contracts.md)
para o mapa completo de eventos e salas.

**"Uma conta por pessoa" em vez de sessão de mesa.** O backend ainda tem um
context inteiro para QR de mesa (`table-session`), herdado da base genérica —
mas o ECRI Circus não usa esse fluxo: não há mesa fixa nem crachá de sessão. A
conta é identificada pelo nome que a pessoa informa, comparado sem diferenciar
maiúsculas/espaços (é digitado à mão a cada pedido), e cada pedido novo de quem
já tem conta aberta cai nela — a conta é da pessoa, não da compra.

**Contexts do backend** (`apps/api/src/contexts/`): `catalog`, `order`,
`kitchen`, `payment`, `table-session`, `tenancy`. `auth` fica fora de
`contexts/` de propósito — é tratado como infraestrutura transversal (JWT,
guards), não domínio de negócio.

**"Polyrepo-in-folder"**: cada app tem seu próprio `package.json` e
`node_modules`, sem workspace pnpm compartilhado — a raiz é só orquestração
(`tools/dev.mjs`, `check-all.sh`). Permite versionar e implantar cada app
independentemente; o trade-off (nenhuma dependência compartilhada entre apps,
mesmo utilitário duplicado quando os dois precisam dele) é aceito
deliberadamente.

**O que não está documentado em lugar nenhum do código**, para não fingir
racional onde não há: por que MikroORM em vez de Prisma/TypeORM, e por que
eventos in-process em vez de uma fila externa. Ambas funcionam bem no porte
atual (evento único, baixa latência desejada, sem necessidade de retry entre
processos), mas essa é leitura da implementação, não uma decisão registrada.

## Convenções (padrão Avenir)

React 19 (sem memo manual — React Compiler) · TanStack Router/Query · Tailwind 4
com tokens semânticos · Biome (proíbe `any`/`as`/`!`) · Conventional Commits ·
só Playwright · SonarQube 70% em código novo.

## Publicar na VM

Ver [deploy/README.md](deploy/README.md). Resumo: `git pull` e
`docker compose -f docker-compose.prod.yml up -d --build` dentro de `deploy/`.
O Caddy separa os apps por porta (1020/1021/1022) quando não há domínio. O
volume do banco sobrevive a `up`, `down` e `--build` — só `down -v` apaga dados.
