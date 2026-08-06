import { Controller, Get, Header } from '@nestjs/common';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { ReportService } from './report.service';

/**
 * Relatório de vendas do evento.
 *
 * Dono, gerência e caixa: os três prestam contas do dinheiro. Balcão e cozinha
 * ficam de fora — a planilha traz o faturamento inteiro da unidade, nome por
 * nome, e não é informação que a operação de linha precise carregar.
 */
@Roles(Role.BrandOwner, Role.LocationManager, Role.Cashier)
@Controller('reports')
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  @Get('sales.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="vendas-ecri-circus.csv"')
  salesCsv(): Promise<string> {
    return this.reports.salesCsv();
  }

  /** Mesmos dados em JSON — serve para conferir na tela sem baixar arquivo. */
  @Get('sales')
  sales() {
    return this.reports.salesRows();
  }
}
