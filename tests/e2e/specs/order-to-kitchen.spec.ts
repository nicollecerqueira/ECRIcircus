import { expect, test } from '@playwright/test';

// First-class real-time flow (Avenir standard): fire an item → assert it appears
// on the KDS → mark ready → assert the waiter/QR sees it. Scaffold outline; the
// selectors are filled in as the UI stabilises.
test.describe('order → kitchen → payment loop', () => {
  // Ainda esboço: dirige a UI, que não sobe no docker-compose.ci.yml (só a API).
  // Marcado como fixme de propósito — teste que falha sempre vira ruído e o time
  // aprende a ignorar o CI vermelho. Sai do fixme quando os web apps entrarem no
  // stack de CI e os seletores estiverem definidos.
  test.fixme('waiter fires an item and it reaches the KDS', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /e-mail/i }).fill('waiter@ecricircus.app');
    await page.getByRole('textbox', { name: /senha/i }).fill('ecri123');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/floor/);
    // TODO: open a table, add an item, then assert the KDS board (STAFF_URL/KDS_URL)
    // shows the fired ticket via the socket event.
  });

  // Tenant-isolation negative test: tenant A must never see tenant B's orders.
  test.fixme('tenant A cannot see tenant B orders', async () => {});
});
