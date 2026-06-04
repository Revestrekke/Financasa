import { useEffect, useMemo, useState } from 'react';
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
  canEdit?: boolean;
  financeState: ModernFinanceState;
  month?: string;
  onNavigate: (page: PageId) => void;
}

type DashboardCardId =
  | 'indicadores'
  | 'visao-mes'
  | 'orcamento'
  | 'alertas'
  | 'faturas'
  | 'metas'
  | 'contas'
  | 'categorias'
  | 'acoes'
  | 'transacoes';

interface DashboardCardConfig {
  id: DashboardCardId;
  title: string;
  wide?: boolean;
}

const DASHBOARD_CARDS: DashboardCardConfig[] = [
  { id: 'indicadores', title: 'Indicadores Estratégicos', wide: true },
  { id: 'visao-mes', title: 'Visão do Mês' },
  { id: 'orcamento', title: 'Orçamento' },
  { id: 'alertas', title: 'Alertas' },
  { id: 'faturas', title: 'Faturas dos Cartões' },
  { id: 'metas', title: 'Metas' },
  { id: 'contas', title: 'Contas e Carteiras' },
  { id: 'categorias', title: 'Gastos por Categoria' },
  { id: 'acoes', title: 'Ações Rápidas' },
  { id: 'transacoes', title: 'Últimas Transações', wide: true }
];

const DASHBOARD_CARD_IDS = DASHBOARD_CARDS.map((card) => card.id);
const DASHBOARD_LAYOUT_STORAGE_KEY = 'financasa-modern-dashboard-cards';

interface DashboardCardLayout {
  hidden: DashboardCardId[];
  order: DashboardCardId[];
}

function normalizeCardLayout(layout?: Partial<DashboardCardLayout> | null): DashboardCardLayout {
  const order = Array.isArray(layout?.order)
    ? layout.order.filter((id): id is DashboardCardId => DASHBOARD_CARD_IDS.includes(id as DashboardCardId))
    : [];
  const hidden = Array.isArray(layout?.hidden)
    ? layout.hidden.filter((id): id is DashboardCardId => DASHBOARD_CARD_IDS.includes(id as DashboardCardId))
    : [];

  return {
    hidden: Array.from(new Set(hidden)),
    order: [...order, ...DASHBOARD_CARD_IDS.filter((id) => !order.includes(id))]
  };
}

function loadCardLayout(): DashboardCardLayout {
  try {
    return normalizeCardLayout(JSON.parse(window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) || 'null'));
  } catch {
    return normalizeCardLayout();
  }
}

function saveCardLayout(layout: DashboardCardLayout) {
  window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeCardLayout(layout)));
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

export function DashboardPage({ canEdit = true, financeState, month = new Date().toISOString().slice(0, 7), onNavigate }: DashboardPageProps) {
  const [cardLayout, setCardLayout] = useState<DashboardCardLayout>(() => loadCardLayout());
  const [editingCards, setEditingCards] = useState(false);
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
  const visibleCards = cardLayout.order.filter((id) => !cardLayout.hidden.includes(id));
  const hiddenCards = DASHBOARD_CARDS.filter((card) => cardLayout.hidden.includes(card.id));
  const alerts = [
    invoices.previsto > 0 ? `${formatCurrency(invoices.previsto)} em faturas abertas/fechadas previstas para ${monthLabel(month)}.` : '',
    budget.pct >= 80 ? `Orçamento já consumiu ${budget.pct}% do limite do mês.` : '',
    metrics.commitment >= 50 ? `Despesas fixas comprometem ${metrics.commitment}% das receitas confirmadas.` : '',
    totalBalance < 0 ? 'Saldo total está negativo considerando contas e carteiras.' : ''
  ].filter(Boolean);

  useEffect(() => {
    saveCardLayout(cardLayout);
  }, [cardLayout]);

  function moveCard(id: DashboardCardId, direction: -1 | 1) {
    setCardLayout((current) => {
      const order = current.order.slice();
      const currentIndex = order.indexOf(id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
      [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
      return { ...current, order };
    });
  }

  function hideCard(id: DashboardCardId) {
    setCardLayout((current) => ({
      ...current,
      hidden: current.hidden.includes(id) ? current.hidden : [...current.hidden, id]
    }));
  }

  function showCard(id: DashboardCardId) {
    setCardLayout((current) => ({
      ...current,
      hidden: current.hidden.filter((cardId) => cardId !== id)
    }));
  }

  function resetCards() {
    setCardLayout(normalizeCardLayout());
  }

  function cardToolbar(card: DashboardCardConfig) {
    if (!editingCards) return undefined;
    const visibleIndex = visibleCards.indexOf(card.id);
    return (
      <div className="modern-card-edit-actions">
        <Button aria-label={`Mover ${card.title} para cima`} disabled={visibleIndex <= 0} onClick={() => moveCard(card.id, -1)} type="button">↑</Button>
        <Button aria-label={`Mover ${card.title} para baixo`} disabled={visibleIndex === visibleCards.length - 1} onClick={() => moveCard(card.id, 1)} type="button">↓</Button>
        <Button aria-label={`Ocultar ${card.title}`} onClick={() => hideCard(card.id)} type="button" variant="ghost">Ocultar</Button>
      </div>
    );
  }

  function cardClass(card: DashboardCardConfig) {
    return [
      'modern-dashboard-card',
      card.wide ? 'modern-dashboard-card--wide' : '',
      editingCards ? 'is-editing' : ''
    ].filter(Boolean).join(' ');
  }

  function renderDashboardCard(card: DashboardCardConfig) {
    if (card.id === 'indicadores') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle="Cálculos consolidados do mês" title="Indicadores Estratégicos" toolbar={cardToolbar(card)}>
          <div className="modern-metric-grid">
            <div><span>Patrimônio Líquido</span><strong className={metrics.netWorth >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(metrics.netWorth)}</strong></div>
            <div><span>Taxa de poupança</span><strong>{metrics.savingsRate}%</strong></div>
            <div><span>Comprometimento</span><strong>{metrics.commitment}%</strong></div>
            <div><span>Maior categoria</span><strong>{metrics.topCategory.categoria}</strong></div>
          </div>
        </Card>
      );
    }

    if (card.id === 'visao-mes') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle={`${summary.txs.length} lançamentos confirmados`} title="Visão do Mês" toolbar={cardToolbar(card)}>
          <div className="modern-month-balance">
            <span>Receitas vs despesas</span>
            <strong className={summary.saldo >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(summary.saldo)}</strong>
          </div>
          <div className="modern-progress-stack">
            <div><span>Receitas</span><i style={{ width: `${summary.rec ? 100 : 0}%` }} /></div>
            <div><span>Despesas</span><i className="is-expense" style={{ width: `${summary.rec ? Math.min(100, (summary.depTotal / summary.rec) * 100) : 0}%` }} /></div>
          </div>
        </Card>
      );
    }

    if (card.id === 'orcamento') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle={`${budget.pct}% utilizado`} title="Orçamento" toolbar={cardToolbar(card)}>
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
      );
    }

    if (card.id === 'alertas') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle="Pontos que pedem atenção" title="Alertas" toolbar={cardToolbar(card)}>
          <div className="modern-list">
            {alerts.map((alert) => <div className="modern-alert-row" key={alert}>{alert}</div>)}
            {!alerts.length && <EmptyState title="Sem alertas críticos" text="Nenhum indicador ultrapassou limites de atenção." />}
          </div>
        </Card>
      );
    }

    if (card.id === 'faturas') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle={`${invoices.invoices.length} fatura(s) no mês`} title="Faturas dos Cartões" toolbar={cardToolbar(card)}>
          <div className="modern-list">
            {invoices.invoices.map((invoice) => (
              <div className="modern-compact-row" key={String(invoice.id)}>
                <span>{financeState.cartoes.find((creditCard) => creditCard.id === invoice.cartao_id)?.nome || 'Cartão'}</span>
                <strong>{formatCurrency(getCreditCardInvoiceTotal(invoice))}</strong>
              </div>
            ))}
            {!invoices.invoices.length && <EmptyState title="Sem faturas no mês" text="Faturas abertas ou fechadas aparecerão aqui." />}
          </div>
        </Card>
      );
    }

    if (card.id === 'metas') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle={`${financeState.metas.length} meta(s)`} title="Metas" toolbar={cardToolbar(card)}>
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
      );
    }

    if (card.id === 'contas') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle="Saldos atuais" title="Contas e Carteiras" toolbar={cardToolbar(card)}>
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
      );
    }

    if (card.id === 'categorias') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle="Despesas confirmadas" title="Gastos por Categoria" toolbar={cardToolbar(card)}>
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
      );
    }

    if (card.id === 'acoes') {
      return (
        <Card className={cardClass(card)} key={card.id} subtitle="Atalhos principais" title="Ações Rápidas" toolbar={cardToolbar(card)}>
          <div className="modern-action-grid">
            <Button onClick={() => onNavigate('lancamentos')} variant="primary">Novo lançamento</Button>
            <Button onClick={() => onNavigate('transacoes')}>Transações</Button>
            <Button onClick={() => onNavigate('cartoes')}>Cartões</Button>
            <Button onClick={() => onNavigate('metas')}>Metas</Button>
          </div>
        </Card>
      );
    }

    return (
      <Card className={cardClass(card)} key={card.id} subtitle="Mais recentes primeiro" title="Últimas Transações" toolbar={cardToolbar(card)}>
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
    );
  }

  return (
    <div className="modern-dashboard">
      <div className="modern-dashboard-toolbar">
        <div>
          <strong>Dashboard</strong>
          <span>{editingCards ? 'Organizando cards' : monthLabel(month)}</span>
        </div>
        <div className="modern-row-actions">
          {editingCards && <Button onClick={resetCards} type="button" variant="ghost">Restaurar padrão</Button>}
          <Button disabled={!canEdit} onClick={() => setEditingCards((current) => !current)} type="button" variant={editingCards ? 'primary' : 'default'}>
            {editingCards ? 'Concluir edição' : 'Editar cards'}
          </Button>
        </div>
      </div>

      {editingCards && hiddenCards.length > 0 && (
        <div className="modern-hidden-card-tray">
          <span>Cards ocultos</span>
          {hiddenCards.map((card) => (
            <Button key={card.id} onClick={() => showCard(card.id)} type="button" variant="ghost">Mostrar {card.title}</Button>
          ))}
        </div>
      )}

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
        {visibleCards.map((id) => renderDashboardCard(DASHBOARD_CARDS.find((card) => card.id === id)!))}
      </div>
    </div>
  );
}
