import { useMemo } from 'react';
import { Badge, Button, Card, EmptyState } from '../components';
import {
  compareTransactionsDesc,
  getTransactionDate,
  getTransactionDescription,
  isTransferTransaction
} from '../../domain/transactions';
import { calculateAccountBalance, getSaldoTotal } from '../../domain/accounts';
import { getBudgetSummary, getExpenseCategoryMap } from '../../domain/budget';
import { getCreditCardInvoiceSummary, getCreditCardInvoiceTotal } from '../../domain/creditCards';
import { getGoalProgress } from '../../domain/goals';
import { getStrategicMetrics, getMesSummary } from '../../domain/reports';
import type { PageId } from '../navigation';
import type { ModernFinanceState } from '../state/financeState';

interface DashboardPageProps {
  financeState: ModernFinanceState;
  month?: string;
  onNavigate: (page: PageId) => void;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDate(value: string) {
  if (!value) return 'Sem data';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function transactionLabel(tipo?: string) {
  if (isTransferTransaction({ tipo })) return 'Transferência';
  return tipo === 'receita' ? 'Receita' : 'Despesa';
}

function transactionTone(tipo?: string) {
  if (isTransferTransaction({ tipo })) return 'warning';
  return tipo === 'receita' ? 'income' : 'expense';
}

export function DashboardPage({ financeState, month = new Date().toISOString().slice(0, 7), onNavigate }: DashboardPageProps) {
  const stateForDomain = {
    contas: financeState.contas,
    faturas_cartao: financeState.faturas_cartao,
    orcamento: financeState.orcamento,
    recorrentes: financeState.recorrentes,
    transacoes: financeState.transacoes
  };
  const summary = getMesSummary(stateForDomain, month);
  const metrics = getStrategicMetrics(stateForDomain, month);
  const budget = getBudgetSummary(financeState.orcamento, financeState.transacoes, month);
  const invoices = getCreditCardInvoiceSummary(financeState.faturas_cartao, month);
  const expenseCategories = getExpenseCategoryMap(financeState.transacoes, month);
  const totalBalance = getSaldoTotal(financeState.contas, financeState.transacoes);

  const latestTransactions = useMemo(
    () => financeState.transacoes.slice().sort(compareTransactionsDesc).slice(0, 6),
    [financeState.transacoes]
  );
  const topBudgetItems = budget.items.slice().sort((a, b) => b.spent - a.spent).slice(0, 4);
  const topCategories = Object.entries(expenseCategories.catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const alerts = [
    invoices.previsto > 0 ? `${formatCurrency(invoices.previsto)} em faturas abertas/fechadas previstas para ${monthLabel(month)}.` : '',
    budget.pct >= 80 ? `Orçamento já consumiu ${budget.pct}% do limite do mês.` : '',
    metrics.commitment >= 50 ? `Despesas fixas comprometem ${metrics.commitment}% das receitas confirmadas.` : '',
    totalBalance < 0 ? 'Saldo total está negativo considerando contas e carteiras.' : ''
  ].filter(Boolean);

  return (
    <div className="modern-dashboard">
      <div className="modern-dashboard-kpis">
        <Card title="Saldo Total" subtitle="Todas as contas">
          <div className={totalBalance >= 0 ? 'modern-kpi-value modern-value-income' : 'modern-kpi-value modern-value-expense'}>{formatCurrency(totalBalance)}</div>
        </Card>
        <Card title="Receitas" subtitle={monthLabel(month)} tone="income">
          <div className="modern-kpi-value modern-value-income">{formatCurrency(summary.rec)}</div>
        </Card>
        <Card title="Despesas" subtitle="Confirmadas no mês" tone="expense">
          <div className="modern-kpi-value modern-value-expense">{formatCurrency(summary.depTotal)}</div>
        </Card>
        <Card title="Faturas" subtitle="Previstas no mês">
          <div className="modern-kpi-value modern-value-transfer">{formatCurrency(invoices.previsto)}</div>
        </Card>
      </div>

      <div className="modern-dashboard-grid">
        <Card title="Indicadores Estratégicos" subtitle="Cálculos consolidados do mês">
          <div className="modern-metric-grid">
            <div><span>Patrimônio Líquido</span><strong className={metrics.netWorth >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(metrics.netWorth)}</strong></div>
            <div><span>Taxa de poupança</span><strong>{metrics.savingsRate}%</strong></div>
            <div><span>Comprometimento</span><strong>{metrics.commitment}%</strong></div>
            <div><span>Maior categoria</span><strong>{metrics.topCategory.categoria}</strong></div>
          </div>
        </Card>

        <Card title="Visão do Mês" subtitle={`${summary.txs.length} lançamentos confirmados`}>
          <div className="modern-month-balance">
            <span>Receitas vs despesas</span>
            <strong className={summary.saldo >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(summary.saldo)}</strong>
          </div>
          <div className="modern-progress-stack">
            <div><span>Receitas</span><i style={{ width: `${summary.rec ? 100 : 0}%` }} /></div>
            <div><span>Despesas</span><i className="is-expense" style={{ width: `${summary.rec ? Math.min(100, (summary.depTotal / summary.rec) * 100) : 0}%` }} /></div>
          </div>
        </Card>

        <Card title="Orçamento" subtitle={`${budget.pct}% utilizado`}>
          <div className="modern-budget-total">
            <strong>{formatCurrency(budget.totalSpent)}</strong>
            <span>de {formatCurrency(budget.totalLimit)}</span>
          </div>
          <div className="modern-progress-line"><i style={{ width: `${budget.pct}%` }} /></div>
          <div className="modern-list">
            {topBudgetItems.map((item) => (
              <div className="modern-compact-row" key={item.category}>
                <span>{item.category}</span>
                <strong>{formatCurrency(item.spent)} / {formatCurrency(item.limit)}</strong>
              </div>
            ))}
            {!topBudgetItems.length && <EmptyState title="Sem orçamento" text="Cadastre limites para acompanhar o mês." />}
          </div>
        </Card>

        <Card title="Alertas" subtitle="Pontos que pedem atenção">
          <div className="modern-list">
            {alerts.map((alert) => <div className="modern-alert-row" key={alert}>{alert}</div>)}
            {!alerts.length && <EmptyState title="Sem alertas críticos" text="Nenhum indicador ultrapassou limites de atenção." />}
          </div>
        </Card>

        <Card title="Faturas dos Cartões" subtitle={`${invoices.invoices.length} fatura(s) no mês`}>
          <div className="modern-list">
            {invoices.invoices.map((invoice) => (
              <div className="modern-compact-row" key={String(invoice.id)}>
                <span>{financeState.cartoes.find((card) => card.id === invoice.cartao_id)?.nome || 'Cartão'}</span>
                <strong>{formatCurrency(getCreditCardInvoiceTotal(invoice))}</strong>
              </div>
            ))}
            {!invoices.invoices.length && <EmptyState title="Sem faturas no mês" text="Faturas abertas ou fechadas aparecerão aqui." />}
          </div>
        </Card>

        <Card title="Metas" subtitle={`${financeState.metas.length} meta(s)`}>
          <div className="modern-list">
            {financeState.metas.slice(0, 3).map((goal) => {
              const progress = getGoalProgress(goal);
              return (
                <div className="modern-goal-row" key={goal.id}>
                  <div><strong>{goal.icone || '◎'} {goal.nome}</strong><span>{formatCurrency(goal.atual)} / {formatCurrency(goal.alvo)}</span></div>
                  <Badge tone={progress >= 100 ? 'success' : 'warning'}>{progress}%</Badge>
                </div>
              );
            })}
            {!financeState.metas.length && <EmptyState title="Sem metas" text="Crie metas para acompanhar seus objetivos." />}
          </div>
        </Card>

        <Card title="Contas e Carteiras" subtitle="Saldos atuais">
          <div className="modern-list">
            {financeState.contas.map((account) => {
              const balance = calculateAccountBalance(account, financeState.transacoes);
              return (
                <div className="modern-compact-row" key={String(account.id)}>
                  <span>{account.nome}</span>
                  <strong className={balance >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(balance)}</strong>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Gastos por Categoria" subtitle="Despesas confirmadas">
          <div className="modern-list">
            {topCategories.map(([category, value]) => (
              <div className="modern-category-row" key={category}>
                <div><span>{category}</span><strong>{formatCurrency(value)}</strong></div>
                <div className="modern-progress-line"><i style={{ width: `${expenseCategories.depTotal ? Math.round((value / expenseCategories.depTotal) * 100) : 0}%` }} /></div>
              </div>
            ))}
            {!topCategories.length && <EmptyState title="Sem gastos confirmados" text="As categorias aparecerão quando houver despesas confirmadas." />}
          </div>
        </Card>

        <Card title="Ações Rápidas" subtitle="Atalhos principais">
          <div className="modern-action-grid">
            <Button onClick={() => onNavigate('lancamentos')} variant="primary">Novo lançamento</Button>
            <Button onClick={() => onNavigate('transacoes')}>Transações</Button>
            <Button onClick={() => onNavigate('cartoes')}>Cartões</Button>
            <Button onClick={() => onNavigate('metas')}>Metas</Button>
          </div>
        </Card>

        <Card title="Últimas Transações" subtitle="Mais recentes primeiro">
          <div className="modern-list">
            {latestTransactions.map((tx) => (
              <div className="modern-list-row modern-dashboard-transaction" key={String(tx.id)}>
                <div>
                  <div className="modern-row-title">{getTransactionDescription(tx) || tx.categoria || 'Lançamento'}</div>
                  <div className="modern-row-subtitle">{formatDate(getTransactionDate(tx))} · {tx.categoria || 'Sem categoria'}</div>
                </div>
                <div className="modern-row-actions">
                  <Badge tone={transactionTone(tx.tipo)}>{transactionLabel(tx.tipo)}</Badge>
                  <Badge tone={tx.status === 'confirmado' ? 'success' : 'warning'}>{tx.status === 'confirmado' ? 'Confirmado' : 'Pendente'}</Badge>
                  <strong className={tx.tipo === 'receita' || tx.tipo === 'transferencia_entrada' ? 'modern-value-income' : tx.tipo === 'transferencia_saida' ? 'modern-value-transfer' : 'modern-value-expense'}>{formatCurrency(tx.valor)}</strong>
                </div>
              </div>
            ))}
            {!latestTransactions.length && <EmptyState title="Sem transações" text="Os últimos lançamentos aparecerão aqui." />}
          </div>
        </Card>
      </div>
    </div>
  );
}
