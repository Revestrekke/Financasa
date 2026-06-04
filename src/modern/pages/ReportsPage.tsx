import { useMemo, useState } from 'react';
import { Badge, Card, EmptyState, Input } from '../components';
import { getBudgetSummary, getExpenseCategoryMap } from '../../domain/budget';
import { getFixedVariableExpenses, getMonthlyReportSeries, getTopExpenseCategory } from '../../domain/reports';
import type { ModernFinanceState } from '../state/financeState';

interface ReportsPageProps {
  financeState: ModernFinanceState;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

export function ReportsPage({ financeState }: ReportsPageProps) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const series = useMemo(() => getMonthlyReportSeries(financeState, month, 6), [financeState, month]);
  const currentBudget = getBudgetSummary(financeState.orcamento, financeState.transacoes, month);
  const fixedVariable = getFixedVariableExpenses(financeState, month);
  const topCategory = getTopExpenseCategory(financeState.transacoes, month);
  const categories = Object.entries(getExpenseCategoryMap(financeState.transacoes, month).catMap)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="modern-report-page">
      <Card
        title="Relatórios"
        subtitle="Receitas, despesas, orçamento e categorias com base em lançamentos confirmados."
        toolbar={<Input label="Mês inicial" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />}
      >
        <div className="modern-report-kpis">
          <div><span>Orçamento utilizado</span><strong>{currentBudget.pct}%</strong></div>
          <div><span>Disponível</span><strong className={currentBudget.available >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(currentBudget.available)}</strong></div>
          <div><span>Despesas fixas</span><strong>{formatCurrency(fixedVariable.fixas)}</strong></div>
          <div><span>Maior categoria</span><strong>{topCategory.categoria}</strong></div>
        </div>
      </Card>

      <div className="modern-report-grid">
        <Card title="Resumo Mensal" subtitle="Próximos 6 meses a partir do mês selecionado">
          <div className="modern-list">
            {series.map((item) => (
              <div className="modern-report-row" key={item.month}>
                <div>
                  <strong>{monthLabel(item.month)}</strong>
                  <span>Faturas previstas {formatCurrency(item.faturasPrevistas)}</span>
                </div>
                <Badge tone="income">{formatCurrency(item.receitas)}</Badge>
                <Badge tone="expense">{formatCurrency(item.despesas)}</Badge>
                <strong className={item.saldo >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(item.saldo)}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Gastos por Categoria" subtitle="Somente despesas confirmadas">
          <div className="modern-list">
            {categories.map(([category, value]) => (
              <div className="modern-category-row" key={category}>
                <div><span>{category}</span><strong>{formatCurrency(value)}</strong></div>
                <div className="modern-progress-line"><i style={{ width: `${topCategory.valor ? Math.min(100, Math.round((value / topCategory.valor) * 100)) : 0}%` }} /></div>
              </div>
            ))}
            {!categories.length && <EmptyState title="Sem despesas confirmadas" text="As categorias aparecerão quando houver lançamentos confirmados no mês." />}
          </div>
        </Card>

        <Card title="Orçamento por Categoria" subtitle={`${currentBudget.totalLimit ? currentBudget.pct : 0}% do limite consumido`}>
          <div className="modern-list">
            {currentBudget.items.map((item) => (
              <div className="modern-category-row" key={item.category}>
                <div><span>{item.category}</span><strong>{formatCurrency(item.spent)} / {formatCurrency(item.limit)}</strong></div>
                <div className="modern-progress-line"><i className={item.spent > item.limit ? 'is-danger' : ''} style={{ width: `${item.limit ? Math.min(100, Math.round((item.spent / item.limit) * 100)) : 0}%` }} /></div>
              </div>
            ))}
            {!currentBudget.items.length && <EmptyState title="Sem orçamento" text="Cadastre limites para acompanhar o consumo." />}
          </div>
        </Card>
      </div>
    </div>
  );
}
