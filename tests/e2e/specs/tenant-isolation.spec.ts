import { type APIRequestContext, expect, test } from '@playwright/test';

/**
 * Teste NEGATIVO de isolamento entre tenants — o portão de saída da Fase 1.
 *
 * Uma leitura cross-tenant é bug P0 (backend.md). Este teste tem de rodar em
 * TODA PR daqui pra frente: é o que garante que ninguém introduza uma consulta
 * que escape do filtro global do MikroORM sem que o CI perceba.
 *
 * Repare que nenhum endpoint aqui recebe tenantId: o escopo vem só do JWT.
 */
const API = process.env.API_URL ?? 'http://localhost:3000/api/v1';

const TENANT_A = { email: 'owner@ecricircus.app', password: 'ecri123', brand: 'ECRI Circus' };
const TENANT_B = { email: 'owner@vizinho.ecricircus.app', password: 'ecri123', brand: 'Circo Vizinho' };

async function login(request: APIRequestContext, creds: typeof TENANT_A) {
  // Só email/senha: a API roda ValidationPipe com forbidNonWhitelisted, então
  // qualquer campo extra no corpo (como `brand`) derruba a requisição com 400.
  const res = await request.post(`${API}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  expect(res.ok(), `login de ${creds.email} deve funcionar`).toBeTruthy();
  const body = await res.json();
  return body.accessToken as string;
}

test.describe('isolamento entre tenants', () => {
  test('cada marca só enxerga as próprias locations e usuários', async ({ request }) => {
    const tokenA = await login(request, TENANT_A);
    const tokenB = await login(request, TENANT_B);

    const [locationsA, locationsB] = await Promise.all([
      request
        .get(`${API}/locations`, { headers: { Authorization: `Bearer ${tokenA}` } })
        .then((r) => r.json()),
      request
        .get(`${API}/locations`, { headers: { Authorization: `Bearer ${tokenB}` } })
        .then((r) => r.json()),
    ]);

    // Cada um vê algo...
    expect(locationsA.length).toBeGreaterThan(0);
    expect(locationsB.length).toBeGreaterThan(0);

    // ...e nada em comum. Esta é a asserção que importa.
    const idsA = new Set(locationsA.map((l: { id: string }) => l.id));
    const overlap = locationsB.filter((l: { id: string }) => idsA.has(l.id));
    expect(overlap, 'nenhuma location pode aparecer para os dois tenants').toHaveLength(0);

    const staffA = await request
      .get(`${API}/staff`, { headers: { Authorization: `Bearer ${tokenA}` } })
      .then((r) => r.json());
    const staffB = await request
      .get(`${API}/staff`, { headers: { Authorization: `Bearer ${tokenB}` } })
      .then((r) => r.json());

    const emailsA = staffA.map((u: { email: string }) => u.email);
    const emailsB = staffB.map((u: { email: string }) => u.email);
    expect(emailsA).toContain(TENANT_A.email);
    expect(emailsA).not.toContain(TENANT_B.email);
    expect(emailsB).toContain(TENANT_B.email);
    expect(emailsB).not.toContain(TENANT_A.email);
  });

  test('cada marca só enxerga o próprio cardápio', async ({ request }) => {
    const tokenA = await login(request, TENANT_A);
    const tokenB = await login(request, TENANT_B);

    const menuOf = async (token: string) => {
      const body = await request
        .get(`${API}/menu`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json());
      return body.categories.flatMap((c: { items: { name: string }[] }) =>
        c.items.map((i) => i.name),
      );
    };

    const itemsA = await menuOf(tokenA);
    const itemsB = await menuOf(tokenB);

    expect(itemsA.length).toBeGreaterThan(0);
    expect(itemsB.length).toBeGreaterThan(0);
    expect(itemsA.some((n: string) => itemsB.includes(n))).toBe(false);
  });

  test('cardápio público exige escopo declarado em vez de vazar tudo', async ({ request }) => {
    // Sem token e sem ?brand/?location: recusa (o filtro falha fechado).
    const semEscopo = await request.get(`${API}/menu`);
    expect(semEscopo.status()).toBe(400);

    // Com a marca declarada, devolve só o cardápio daquela marca.
    const vizinho = await request.get(`${API}/menu?brand=vizinho`).then((r) => r.json());
    const nomes = vizinho.categories.flatMap((c: { items: { name: string }[] }) =>
      c.items.map((i) => i.name),
    );
    expect(nomes).toContain('Espetinho');
    expect(nomes).not.toContain('Cachorro-quente');
  });

  test('um tenant não altera item de cardápio do outro', async ({ request }) => {
    const tokenA = await login(request, TENANT_A);
    const tokenB = await login(request, TENANT_B);

    const menuA = await request
      .get(`${API}/menu`, { headers: { Authorization: `Bearer ${tokenA}` } })
      .then((r) => r.json());
    const itemDoA = menuA.categories[0].items[0].id;

    // B tenta editar item de A: o filtro global faz o item "não existir" para ele.
    const res = await request.patch(`${API}/admin/menu/${itemDoA}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: { priceCents: 1 },
    });
    expect(res.status(), 'editar item de outra marca deve dar 404').toBe(404);
  });

  test('/me devolve a marca do próprio token', async ({ request }) => {
    const tokenA = await login(request, TENANT_A);
    const me = await request
      .get(`${API}/me`, { headers: { Authorization: `Bearer ${tokenA}` } })
      .then((r) => r.json());
    expect(me.tenant.name).toBe(TENANT_A.brand);
  });

  test('sem token não há leitura: o filtro falha fechado', async ({ request }) => {
    const res = await request.get(`${API}/locations`);
    expect(res.status(), 'anônimo não pode ler dado de tenant').toBe(401);
  });

  test('token adulterado não dá acesso a outro tenant', async ({ request }) => {
    const tokenA = await login(request, TENANT_A);
    // Troca o payload do JWT mantendo a assinatura: deve ser rejeitado.
    const [header, payload, signature] = tokenA.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    claims.tenantId = '33333333-3333-3333-3333-333333333333';
    const forged = `${header}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`;

    const res = await request.get(`${API}/locations`, {
      headers: { Authorization: `Bearer ${forged}` },
    });
    expect(res.status(), 'assinatura inválida deve barrar').toBe(401);
  });
});
