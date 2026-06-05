import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveGridLayout,
  noCompactor,
  useContainerWidth,
  type Layout,
  type LayoutItem,
  type ResponsiveLayouts
} from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
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
  dashboardLayout?: Record<string, unknown>;
  financeState: ModernFinanceState;
  month?: string;
  onDashboardLayoutChange?: (layout: Record<string, unknown>) => void;
  onNavigate: (page: PageId) => void;
}

type DashboardCardId =
  | 'saldo-total'
  | 'receitas'
  | 'despesas'
  | 'faturas-kpi'
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
}

interface StoredDashboardGridLayout {
  layouts: Layouts;
  version: 2;
}

type Layouts = ResponsiveLayouts<string>;

const DASHBOARD_LAYOUT_STORAGE_KEY = 'financasa-modern-dashboard-grid';
const DASHBOARD_BREAKPOINTS = { lg: 1200, md: 980, sm: 760, xs: 480, xxs: 0 };
const DASHBOARD_COLS = { lg: 12, md: 10, sm: 6, xs: 2, xxs: 1 };
const DASHBOARD_GRID_MARGIN: [number, number] = [16, 16];
const DASHBOARD_ROW_HEIGHT = 30;

const DASHBOARD_CARDS: DashboardCardConfig[] = [
  { id: 'saldo-total', title: 'Saldo Total' },
  { id: 'receitas', title: 'Receitas' },
  { id: 'despesas', title: 'Despesas' },
  { id: 'faturas-kpi', title: 'Faturas' },
  { id: 'indicadores', title: 'Indicadores Estratégicos' },
  { id: 'visao-mes', title: 'Visão do Mês' },
  { id: 'orcamento', title: 'Orçamento' },
  { id: 'alertas', title: 'Alertas' },
  { id: 'faturas', title: 'Faturas dos Cartões' },
  { id: 'metas', title: 'Metas' },
  { id: 'contas', title: 'Contas e Carteiras' },
  { id: 'categorias', title: 'Gastos por Categoria' },
  { id: 'acoes', title: 'Ações Rápidas' },
  { id: 'transacoes', title: 'Últimas Transações' }
];

const DASHBOARD_CARD_IDS = DASHBOARD_CARDS.map((card) => card.id);

const DEFAULT_LG_LAYOUT: LayoutItem[] = [
  { i: 'saldo-total', x: 0, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'receitas', x: 3, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'despesas', x: 6, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'faturas-kpi', x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'indicadores', x: 0, y: 4, w: 6, h: 6, minW: 3, minH: 4 },
  { i: 'visao-mes', x: 6, y: 4, w: 3, h: 6, minW: 2, minH: 4 },
  { i: 'faturas', x: 9, y: 4, w: 3, h: 5, minW: 2, minH: 3 },
  { i: 'orcamento', x: 0, y: 10, w: 4, h: 8, minW: 3, minH: 5 },
  { i: 'categorias', x: 4, y: 10, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'alertas', x: 8, y: 9, w: 4, h: 7, minW: 3, minH: 4 },
  { i: 'metas', x: 0, y: 18, w: 4, h: 6, minW: 2, minH: 4 },
  { i: 'contas', x: 4, y: 16, w: 4, h: 6, minW: 2, minH: 4 },
  { i: 'acoes', x: 8, y: 16, w: 4, h: 5, minW: 2, minH: 4 },
  { i: 'transacoes', x: 0, y: 24, w: 8, h: 8, minW: 3, minH: 5 }
];

function cloneLayout(layout: Layout): LayoutItem[] {
  return layout.map((item) => ({ ...item }));
}

function fitItemToCols(item: LayoutItem, cols: number, index: number): LayoutItem {
  const width = Math.max(1, Math.min(cols, item.w));
  return {
    ...item,
    minW: Math.min(cols, item.minW || 1),
    w: width,
    x: Math.max(0, Math.min(cols - width, item.x)),
    y: Number.isFinite(item.y) ? item.y : index * 4
  };
}

function oneColumnLayout(layout: Layout, cols: number): LayoutItem[] {
  let y = 0;
  return layout.map((item) => {
    const height = Math.max(item.minH || 3, Math.min(item.h, item.i === 'transacoes' ? 8 : 7));
    const next = { ...item, x: 0, y, w: cols, h: height, minW: 1 };
    y += height + 1;
    return next;
  });
}

function defaultLayouts(): Layouts {
  const lg = cloneLayout(DEFAULT_LG_LAYOUT);
  return {
    lg,
    md: lg.map((item, index) => fitItemToCols({ ...item, x: Math.round((item.x / 12) * 10), w: Math.max(2, Math.round((item.w / 12) * 10)) }, 10, index)),
    sm: lg.map((item, index) => fitItemToCols({ ...item, x: Math.round((item.x / 12) * 6), w: Math.max(2, Math.round((item.w / 12) * 6)) }, 6, index)),
    xs: oneColumnLayout(lg, 2),
    xxs: oneColumnLayout(lg, 1)
  };
}

function isDashboardCardId(value: string): value is DashboardCardId {
  return DASHBOARD_CARD_IDS.includes(value as DashboardCardId);
}

function normalizeLayoutItems(items: unknown, fallback: Layout, cols: number): LayoutItem[] {
  const byId = new Map<string, LayoutItem>();
  const rawItems = Array.isArray(items) ? items : [];

  rawItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<LayoutItem>;
    if (!candidate.i || !isDashboardCardId(candidate.i)) return;
    const fallbackItem = fallback.find((entry) => entry.i === candidate.i);
    if (!fallbackItem) return;

    byId.set(candidate.i, fitItemToCols({
      ...fallbackItem,
      x: Number.isFinite(candidate.x) ? Number(candidate.x) : fallbackItem.x,
      y: Number.isFinite(candidate.y) ? Number(candidate.y) : fallbackItem.y + index,
      w: Number.isFinite(candidate.w) ? Number(candidate.w) : fallbackItem.w,
      h: Number.isFinite(candidate.h) ? Number(candidate.h) : fallbackItem.h
    }, cols, index));
  });

  return fallback.map((fallbackItem, index) => byId.get(fallbackItem.i) || fitItemToCols(fallbackItem, cols, index));
}

function normalizeGridLayout(layout?: unknown): StoredDashboardGridLayout {
  const defaults = defaultLayouts();
  const source = layout && typeof layout === 'object' && 'layouts' in layout
    ? ((layout as { layouts?: Partial<Layouts> }).layouts || {})
    : {};

  return {
    version: 2,
    layouts: {
      lg: normalizeLayoutItems(source.lg, defaults.lg!, DASHBOARD_COLS.lg),
      md: normalizeLayoutItems(source.md, defaults.md!, DASHBOARD_COLS.md),
      sm: normalizeLayoutItems(source.sm, defaults.sm!, DASHBOARD_COLS.sm),
      xs: normalizeLayoutItems(source.xs, defaults.xs!, DASHBOARD_COLS.xs),
      xxs: normalizeLayoutItems(source.xxs, defaults.xxs!, DASHBOARD_COLS.xxs)
    }
  };
}

function loadGridLayout(): StoredDashboardGridLayout {
  try {
    return normalizeGridLayout(JSON.parse(window.localStorage.getItem(DASHBOARD_LAYOUT_STORAGE_KEY) || 'null'));
  } catch {
    return normalizeGridLayout();
  }
}

function saveGridLayout(layout: StoredDashboardGridLayout) {
  window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeGridLayout(layout as unknown as Record<string, unknown>)));
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

export function DashboardPage({
  canEdit = true,
  dashboardLayout,
  financeState,
  month = new Date().toISOString().slice(0, 7),
  onDashboardLayoutChange,
  onNavigate
}: DashboardPageProps) {
  const [gridLayout, setGridLayout] = useState<StoredDashboardGridLayout>(() => normalizeGridLayout(dashboardLayout || loadGridLayout()));
  const [editingCards, setEditingCards] = useState(false);
  const { containerRef, mounted, width } = useContainerWidth({ initialWidth: 1200 });
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

  useEffect(() => {
    saveGridLayout(gridLayout);
    onDashboardLayoutChange?.(gridLayout as unknown as Record<string, unknown>);
  }, [gridLayout]);

  useEffect(() => {
    const nextLayout = normalizeGridLayout(dashboardLayout || loadGridLayout());
    setGridLayout((current) => (
      JSON.stringify(current) === JSON.stringify(nextLayout) ? current : nextLayout
    ));
  }, [dashboardLayout]);

  function resetCards() {
    if (!canEdit) return;
    setGridLayout(normalizeGridLayout());
  }

  function handleGridLayoutChange(_currentLayout: Layout, allLayouts: Layouts) {
    if (!editingCards || !canEdit) return;
    setGridLayout(normalizeGridLayout({ version: 2, layouts: allLayouts } as unknown as Record<string, unknown>));
  }

  function cardClass() {
    return ['modern-dashboard-card', editingCards ? 'is-editing' : ''].filter(Boolean).join(' ');
  }

  function renderDashboardCard(card: DashboardCardConfig) {
    if (card.id === 'saldo-total') {
      return (
        <Card className={cardClass()} subtitle="Todas as contas" title="Saldo Total">
          <div className={totalBalance >= 0 ? 'modern-kpi-value modern-value-income' : 'modern-kpi-value modern-value-expense'}>{formatCurrency(totalBalance)}</div>
        </Card>
      );
    }

    if (card.id === 'receitas') {
      return (
        <Card className={cardClass()} subtitle={monthLabel(month)} title="Receitas" tone="income">
          <div className="modern-kpi-value modern-value-income">{formatCurrency(summary.rec)}</div>
        </Card>
      );
    }

    if (card.id === 'despesas') {
      return (
        <Card className={cardClass()} subtitle="Confirmadas no mês" title="Despesas" tone="expense">
          <div className="modern-kpi-value modern-value-expense">{formatCurrency(summary.depTotal)}</div>
        </Card>
      );
    }

    if (card.id === 'faturas-kpi') {
      return (
        <Card className={cardClass()} subtitle="Previstas no mês" title="Faturas">
          <div className="modern-kpi-value modern-value-transfer">{formatCurrency(invoices.previsto)}</div>
        </Card>
      );
    }

    if (card.id === 'indicadores') {
      return (
        <Card className={cardClass()} subtitle="Cálculos consolidados do mês" title="Indicadores Estratégicos">
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
        <Card className={cardClass()} subtitle={`${summary.txs.length} lançamentos confirmados`} title="Visão do Mês">
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
        <Card className={cardClass()} subtitle={`${budget.pct}% utilizado`} title="Orçamento">
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
        <Card className={cardClass()} subtitle="Pontos que pedem atenção" title="Alertas">
          <div className="modern-list">
            {alerts.map((alert) => <div className="modern-alert-row" key={alert}>{alert}</div>)}
            {!alerts.length && <EmptyState title="Sem alertas críticos" text="Nenhum indicador ultrapassou limites de atenção." />}
          </div>
        </Card>
      );
    }

    if (card.id === 'faturas') {
      return (
        <Card className={cardClass()} subtitle={`${invoices.invoices.length} fatura(s) no mês`} title="Faturas dos Cartões">
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
        <Card className={cardClass()} subtitle={`${financeState.metas.length} meta(s)`} title="Metas">
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
        <Card className={cardClass()} subtitle="Saldos atuais" title="Contas e Carteiras">
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
        <Card className={cardClass()} subtitle="Despesas confirmadas" title="Gastos por Categoria">
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
        <Card className={cardClass()} subtitle="Atalhos principais" title="Ações Rápidas">
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
      <Card className={cardClass()} subtitle="Mais recentes primeiro" title="Últimas Transações">
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
          <span>{editingCards ? 'Arraste ou redimensione os cards livremente' : monthLabel(month)}</span>
        </div>
        <div className="modern-row-actions">
          {editingCards && <Button onClick={resetCards} type="button" variant="ghost">Restaurar padrão</Button>}
          <Button disabled={!canEdit} onClick={() => setEditingCards((current) => !current)} type="button" variant={editingCards ? 'primary' : 'default'}>
            {editingCards ? 'Concluir edição' : 'Editar cards'}
          </Button>
        </div>
      </div>

      <div className="modern-dashboard-layout-shell" ref={containerRef}>
        {mounted && (
          <ResponsiveGridLayout
            breakpoints={DASHBOARD_BREAKPOINTS}
            className={['modern-dashboard-layout-grid', editingCards ? 'is-editing' : ''].filter(Boolean).join(' ')}
            cols={DASHBOARD_COLS}
            compactor={noCompactor}
            containerPadding={[0, 0]}
            dragConfig={{
              bounded: false,
              cancel: 'button, input, select, textarea, a, .fc-button',
              enabled: editingCards && canEdit,
              threshold: 2
            }}
            layouts={gridLayout.layouts}
            margin={DASHBOARD_GRID_MARGIN}
            onLayoutChange={handleGridLayoutChange}
            resizeConfig={{
              enabled: editingCards && canEdit,
              handles: ['se', 'e', 's']
            }}
            rowHeight={DASHBOARD_ROW_HEIGHT}
            width={width}
          >
            {DASHBOARD_CARDS.map((card) => (
              <div className="modern-dashboard-layout-item" key={card.id}>
                {renderDashboardCard(card)}
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
