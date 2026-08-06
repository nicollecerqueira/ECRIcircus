import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { currentTenant } from '../../common/tenant/tenant-context';
import { Order as OrderEntity } from './domain/order.entity';
import { ORDER_STATUS_LABEL, PAYMENT_INTENT_LABEL, PAYMENT_METHOD_LABEL } from './report.labels';

/**
 * Relatório de vendas do evento — uma linha por ITEM vendido.
 *
 * Linha por item, e não por conta, porque a pergunta que o relatório responde é
 * "o que foi comprado, por quem e como foi pago": com uma linha por conta, os
 * itens virariam um amontoado numa célula e ninguém somaria nada. Assim, quem
 * abrir no Excel filtra por equipe, agrupa por item ou soma a coluna do total
 * sem precisar reorganizar a planilha.
 */
export interface SalesRow {
  dataHora: string;
  conta: string;
  equipe: string;
  item: string;
  qtd: number;
  precoUnitCents: number;
  totalCents: number;
  formaPagamento: string;
  statusConta: string;
  origem: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  counter: 'Balcão',
  delivery: 'Delivery',
  pos: 'Caixa',
  qr: 'QR',
  waiter: 'Garçom',
};

/** Data e hora locais do evento, no formato que o Excel brasileiro reconhece. */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

/** "3,50" — vírgula decimal, senão o Excel em português lê 3.50 como texto. */
function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Célula CSV segura.
 *
 * Aspas dobradas e o campo inteiro entre aspas: nome com ponto e vírgula
 * ("Combo; grande") ou com quebra de linha partiria a linha em duas colunas —
 * e o relatório carrega texto digitado à mão, onde isso acontece.
 */
function cell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

@Injectable()
export class ReportService {
  constructor(private readonly em: EntityManager) {}

  async salesRows(): Promise<SalesRow[]> {
    const { locationId } = currentTenant();
    const orders = await this.em.find(
      OrderEntity,
      // Cancelada não é venda; fica de fora para a soma da planilha ser o que
      // realmente entrou. Contas ainda ABERTAS entram, com o status na coluna:
      // no fim do evento é justamente o que falta receber.
      { location: locationId, status: { $ne: 'cancelled' } },
      { populate: ['items', 'payments'], orderBy: { createdAt: 'asc' } },
    );

    const rows: SalesRow[] = [];
    for (const order of orders) {
      const conta = order.customerName?.trim() || `#${order.id.slice(0, 8)}`;
      const pagamento = this.paymentLabel(order);
      const statusConta = ORDER_STATUS_LABEL[order.status] ?? order.status;
      const origem = CHANNEL_LABEL[order.channel] ?? order.channel;

      for (const item of order.items.getItems()) {
        // Item cancelado não foi vendido — some da planilha para não inflar o
        // total de quem simplesmente arrasta a coluna e soma.
        if (item.state === 'voided') {
          continue;
        }
        rows.push({
          dataHora: formatDateTime(order.createdAt),
          conta,
          equipe: order.teamName?.trim() || 'Sem equipe',
          item: item.name,
          qtd: item.qty,
          precoUnitCents: item.unitPriceCents,
          totalCents: item.unitPriceCents * item.qty,
          formaPagamento: pagamento,
          statusConta,
          origem,
        });
      }
    }
    return rows;
  }

  /**
   * O que a conta pagou. Prioriza o pagamento REGISTRADO pelo caixa; sem ele,
   * mostra o que o cliente declarou no app, marcado como declaração — as duas
   * coisas na mesma coluna, mas nunca confundidas, porque só a primeira é
   * dinheiro que entrou.
   */
  private paymentLabel(order: OrderEntity): string {
    const payments = order.payments.getItems();
    if (payments.length > 0) {
      // Conta paga em partes (metade pix, metade dinheiro) vira "Pix + Dinheiro".
      const formas: string[] = [
        ...new Set(payments.map((p) => PAYMENT_METHOD_LABEL[p.method] ?? String(p.method))),
      ];
      return formas.join(' + ');
    }
    if (order.paymentIntent) {
      return `${PAYMENT_INTENT_LABEL[order.paymentIntent] ?? order.paymentIntent} (a receber)`;
    }
    return 'Não informado';
  }

  /**
   * CSV que o Excel abre com dois cliques.
   *
   * Ponto e vírgula, não vírgula: no Excel em português a vírgula é o separador
   * DECIMAL, e um arquivo separado por vírgula desaba numa coluna só. O BOM no
   * começo é o que faz "Ação" e "R$" aparecerem certos em vez de "AÃ§Ã£o".
   */
  async salesCsv(): Promise<string> {
    const rows = await this.salesRows();
    const header = [
      'Data/hora',
      'Conta',
      'Equipe',
      'Item',
      'Qtd',
      'Preço unit. (R$)',
      'Total (R$)',
      'Forma de pagamento',
      'Status da conta',
      'Origem',
    ];

    const lines = [header.map(cell).join(';')];
    for (const r of rows) {
      lines.push(
        [
          cell(r.dataHora),
          cell(r.conta),
          cell(r.equipe),
          cell(r.item),
          cell(r.qtd),
          cell(centsToDecimal(r.precoUnitCents)),
          cell(centsToDecimal(r.totalCents)),
          cell(r.formaPagamento),
          cell(r.statusConta),
          cell(r.origem),
        ].join(';'),
      );
    }

    // Linha de total no fim: é a primeira coisa que se procura num relatório de
    // vendas, e deixá-la para quem abrir a planilha somar convida a erro.
    const total = rows.reduce((sum, r) => sum + r.totalCents, 0);
    lines.push('', [cell('TOTAL'), '', '', '', '', '', cell(centsToDecimal(total))].join(';'));

    const BOM = '﻿';
    return `${BOM}${lines.join('\r\n')}\r\n`;
  }
}
