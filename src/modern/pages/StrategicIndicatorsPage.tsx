import { useState } from 'react';
import { Badge, Card, EmptyState, Input } from '../components';
import { calculateAccountBalance } from '../../domain/accounts';
import { getBudgetSummary } from '../../domain/budget';
import { getCreditCardInvoiceSummary } from '../../domain/creditCards';
import { getStrategicMetrics } from '../../domain/reports';
import type { ModernFinanceState } from '../state/financeState';

interface StrategicIndicatorsPageProps {
  financeState: ModernFinanceState;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function StrategicIndicatorsPage({ financeState }: StrategicIndicatorsPageProps) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const metrics = getStrategicMetrics(financeState, month);
  const budget = getBudgetSummary(financeState.orcamento, financeState.transacoes, month);
  const invoices = getCreditCardInvoiceSummary(financeState.faturas_cartao, month);
  const accountBalances = financeState.contas.map((account) => ({
    account,
    balance: calculateAccountBalance(account, financeState.transacoes)
  }));

  const healthItems = [
    { label: 'Patrimônio líquido', value: formatCurrency(metrics.netWorth), tone: metrics.netWorth >= 0 ? 'income' : 'expense' },
    { label: 'Comprometimento', value: `${metrics.commitment}%`, tone: metrics.commitment > 50 ? 'expense' : 'income' },
    { label: 'Poupança', value: `${metrics.savingsRate}%`, tone: metrics.savingsRate >= 20 ? 'income' : 'warning' },
    { label: 'Orçamento consumido', value: `${budget.pct}%`, tone: budget.pct > 90 ? 'expense' : 'warning' }
  ] as const;

  return (
    <div className="modern-report-page">
      <Card
        title="Indicadores Estratégicos"
        subtitle="Leitura executiva com saldos negativos considerados no patrimônio líquido."
        toolbar={<Input label="Mês" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />}
      >
        <div className="modern-indicator-grid">
          {healthItems.map((item) => (
            <div className="modern-indicator-card" key={item.label}>
              <span>{item.label}</span>
              <strong className={item.tone === 'income' ? 'modern-value-income' : item.tone === 'expense' ? 'modern-value-expense' : 'modern-value-transfer'}>{item.value}</strong>
            </div>
          ))}
        </div>
      </Card>

      <div className="modern-report-grid">
        <Card title="Composição das Despesas" subtitle="Fixas, variáveis e faturas previstas">
          <div className="modern-indicator-split">
            <div><span>Fixas</span><strong>{formatCurrency(metrics.fixed.fixas)}</strong></div>
            <div><span>Variáveis + faturas</span><strong>{formatCurrency(metrics.fixed.variaveis)}</strong></div>
            <div><span>Faturas previstas</span><strong>{formatCurrency(invoices.previsto)}</strong></div>
          </div>
        </Card>

        <Card title="Contas no Patrimônio" subtitle="Saldos positivos e negativos entram no total">
          <div className="modern-list">
            {accountBalances.map(({ account, balance }) => (
              <div className="modern-compact-row" key={String(account.id)}>
                <span>{account.nome}</span>
                <strong className={balance >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(balance)}</strong>
              </div>
            ))}
            {!accountBalances.length && <EmptyState title="Sem contas" text="Cadastre contas para calcular patrimônio líquido." />}
          </div>
        </Card>

        <Card title="Categoria Crítica" subtitle="Maior gasto confirmado do mês">
          <div className="modern-indicator-highlight">
            <strong>{metrics.topCategory.categoria}</strong>
            <span>{formatCurrency(metrics.topCategory.valor)} · {metrics.topCategory.pct}% das despesas</span>
            <Badge tone={metrics.topCategory.pct > 50 ? 'danger' : 'warning'}>{metrics.topCategory.pct > 50 ? 'Concentrado' : 'Monitorar'}</Badge>
          </div>
        </Card>

        <Card title="Orçamento Estratégico" subtitle="Limites e folga do mês">
          <div className="modern-indicator-split">
            <div><span>Limite</span><strong>{formatCurrency(budget.totalLimit)}</strong></div>
            <div><span>Usado</span><strong>{formatCurrency(budget.totalSpent)}</strong></div>
            <div><span>Folga</span><strong className={budget.available >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(budget.available)}</strong></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
