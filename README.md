# ECRI Circus

Sistema de pedidos do evento **ECRI Circus**: a pessoa pede pelo celular, o
pedido cai na cozinha em tempo real e é **entregue na sala da equipe dela**. No
fim, a conta é acertada no caixa.

Não há mesa, não há QR code e não há garçom levando comanda — o app abre direto
no cardápio, e quem pede se identifica por **nome, equipe e sala**.

## Como funciona

```
CLIENTE (:1020)                COZINHA (:1022)            EQUIPE (:1021)
cardápio                        quadro de comandas          contas abertas
   ↓ adiciona itens                 ↑ tempo real                ↓
carrinho                        ┌───────────────┐           caixa
   ↓ nome · equipe · sala       │ 2x Hambúrguer │              ↓
   ↓ forma de pagamento    ───▶ │ 🚩 Sala 7     │ ──────▶  fechamento
pedido enviado                  │    Ana Souza  │           (itens + total)
   ↓                            └───────────────┘
acompanha o preparo
   ↓
relatório no WhatsApp
```

**Uma conta por pessoa.** Todo pedido de quem já tem conta aberta é somado nela,
comparando o nome sem diferenciar maiúsculas nem espaços. Sem isso, cada pedido
viraria uma conta nova com o mesmo nome e o caixa cobraria pedaços soltos.

**A forma de pagamento é uma declaração, não uma cobrança.** O cliente diz como
pretende pagar — Pix, dinheiro (com ou sem troco), cartão ou **colocar na
conta** — e quem registra o pagamento de fato é o caixa. "Na conta" é o pedido
que fica em aberto para acertar depois.

## As três aplicações

| app | porta | para quem | o que faz |
| --- | --- | --- | --- |
| `web-order` | **1020** | quem pede | cardápio, carrinho, acompanhamento do pedido |
| `web-staff` | **1021** | equipe | contas abertas · caixa · cardápio |
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
(cd apps/web-order  && pnpm install && pnpm dev)                          # :1020
(cd apps/web-staff  && pnpm install && pnpm dev)                          # :1021
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

1. **Cliente** (`:1020`) → escolha itens → carrinho → informe **nome completo,
   equipe e sala** → escolha a forma de pagamento → enviar.
2. **Cozinha** (`:1022`) → login `kitchen@ecricircus.app` → escolha a estação →
   a comanda aparece com **🚩 sala e nome** → toque para `preparando` / `pronto`.
3. **Equipe** (`:1021`) → login `waiter@ecricircus.app` → **Contas abertas**
   mostra a conta da pessoa, com equipe e total.
4. **Caixa** (`:1021/pos`) → abra a conta → o fechamento lista **item a item** o
   que foi consumido → registre o pagamento.

Peça duas vezes com o mesmo nome: os pedidos entram na **mesma conta**.

## Detalhes que não são óbvios pelo código

**Fichas são crédito, não comida.** A categoria `Fichas` do cardápio tem
`requiresPreparation: false`: entra na conta e no relatório de vendas, mas
**não vira comanda na cozinha**.

**As equipes são uma lista fixa no front**, duplicada nos dois apps
(`web-order/src/app/shared/teams.ts` e
`web-staff/src/app/pages/floor/teams.ts`) porque não há pacote compartilhado.
Ao mexer numa, mexa na outra.

**O relatório do WhatsApp** é um link `wa.me` que o cliente toca ao fim do
pedido, com itens, total, equipe, sala e forma de pagamento. O número vem de
`VITE_WHATSAPP_NUMERO` (ver `apps/web-order/.env.example`); vazio, a tela mostra
o texto para copiar em vez de um link quebrado.

**A cor no painel da cozinha é funcional**, não decorativa: verde → âmbar →
vermelho marcam o envelhecimento da comanda, e por isso o vermelho da marca
**não** é usado como cor primária naquela tela.

## Convenções (padrão Avenir)

React 19 (sem memo manual — React Compiler) · TanStack Router/Query · Tailwind 4
com tokens semânticos · Biome (proíbe `any`/`as`/`!`) · Conventional Commits ·
só Playwright · SonarQube 70% em código novo. Multi-tenancy é invariante
obrigatória (ver [docs/tenancy.md](docs/tenancy.md)).

## Publicar na VM

Ver [deploy/README.md](deploy/README.md). Resumo: `git pull` e
`docker compose -f docker-compose.prod.yml up -d --build` dentro de `deploy/`.
O Caddy separa os apps por porta (1020/1021/1022) quando não há domínio. O
volume do banco sobrevive a `up`, `down` e `--build` — só `down -v` apaga dados.
