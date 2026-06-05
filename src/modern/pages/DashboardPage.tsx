import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ResponsiveGridLayout,
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

interface DashboardWidget {
  cardId: DashboardCardId;
  hidden?: boolean;
  id: string;
  title?: string;
}

interface StoredDashboardGridLayout {
  layouts: Layouts;
  updatedAt?: string;
  version: 3;
  widgets: DashboardWidget[];
}

type Layouts = ResponsiveLayouts<string>;
type SizePresetId = 'small' | 'medium' | 'large' | 'xlarge';

const DASHBOARD_LAYOUT_STORAGE_KEY = 'financasa-modern-dashboard-grid';
const DASHBOARD_BREAKPOINTS = { lg: 1200, md: 980, sm: 760, xs: 0 };
const DASHBOARD_COLS = { lg: 12, md: 12, sm: 6, xs: 1 };
const DASHBOARD_GRID_MARGIN: [number, number] = [14, 14];
const DASHBOARD_ROW_HEIGHT = 36;

const SIZE_PRESETS: Record<SizePresetId, { h: number; label: string; w: number }> = {
  small: { label: 'Pequeno', w: 3, h: 2 },
  medium: { label: 'Médio', w: 4, h: 3 },
  large: { label: 'Grande', w: 6, h: 4 },
  xlarge: { label: 'Extra grande', w: 12, h: 6 }
};

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
const DASHBOARD_CARD_MAP = Object.fromEntries(DASHBOARD_CARDS.map((card) => [card.id, card])) as Record<DashboardCardId, DashboardCardConfig>;

const DEFAULT_LG_LAYOUT: LayoutItem[] = [
  { i: 'saldo-total', x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'receitas', x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'despesas', x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'faturas-kpi', x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: 'indicadores', x: 0, y: 3, w: 6, h: 4, minW: 3, minH: 3 },
  { i: 'visao-mes', x: 6, y: 3, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'faturas', x: 9, y: 3, w: 3, h: 4, minW: 2, minH: 3 },
  { i: 'orcamento', x: 0, y: 7, w: 4, h: 6, minW: 3, minH: 4 },
  { i: 'categorias', x: 4, y: 7, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'alertas', x: 8, y: 7, w: 4, h: 5, minW: 3, minH: 3 },
  { i: 'metas', x: 0, y: 13, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'contas', x: 4, y: 12, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'acoes', x: 8, y: 12, w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'transacoes', x: 0, y: 18, w: 8, h: 6, minW: 3, minH: 4 }
];

function defaultWidgets(): DashboardWidget[] {
  return DASHBOARD_CARDS.map((card) => ({ cardId: card.id, id: card.id }));
}

function cloneLayout(layout: Layout): LayoutItem[] {
  return layout.map((item) => ({ ...item }));
}

function fitItemToCols(item: LayoutItem, cols: number, index: number): LayoutItem {
  const width = Math.max(1, Math.min(cols, item.w));
  return {
    ...item,
    minW: Math.max(1, Math.min(cols, item.minW || 1)),
    w: width,
    x: Math.max(0, Math.min(cols - width, item.x)),
    y: Number.isFinite(item.y) ? item.y : index * 3
  };
}

function oneColumnLayout(layout: Layout, widgets: DashboardWidget[]) {
  let y = 0;
  return widgets.map((widget, index) => {
    const fallback = layout.find((item) => item.i === widget.cardId) || layout[0]!;
    const height = Math.max(fallback.minH || 2, Math.min(fallback.h, widget.cardId === 'transacoes' ? 6 : 5));
    const next = { ...fallback, i: widget.id, x: 0, y, w: 1, h: height, minW: 1 };
    y += height;
    return fitItemToCols(next, 1, index);
  });
}

function defaultBreakpointLayouts() {
  const lg = cloneLayout(DEFAULT_LG_LAYOUT);
  return {
    lg,
    md: cloneLayout(lg),
    sm: lg.map((item, index) => fitItemToCols({ ...item, x: Math.round((item.x / 12) * 6), w: Math.max(2, Math.round((item.w / 12) * 6)) }, 6, index)),
    xs: oneColumnLayout(lg, defaultWidgets())
  };
}

function isDashboardCardId(value: string): value is DashboardCardId {
  return DASHBOARD_CARD_IDS.includes(value as DashboardCardId);
}

function normalizeWidgets(input: unknown): DashboardWidget[] {
  const rawWidgets = Array.isArray(input) ? input : [];
  const widgets = rawWidgets.flatMap((item): DashboardWidget[] => {
    if (!item || typeof item !== 'object') return [];
    const candidate = item as Partial<DashboardWidget>;
    if (!candidate.id || !candidate.cardId || !isDashboardCardId(candidate.cardId)) return [];
    return [{
      cardId: candidate.cardId,
      hidden: Boolean(candidate.hidden),
      id: String(candidate.id),
      title: typeof candidate.title === 'string' ? candidate.title : undefined
    }];
  });

  const withDefaults = [...widgets];
  DASHBOARD_CARDS.forEach((card) => {
    if (!withDefaults.some((widget) => widget.id === card.id)) {
      withDefaults.push({ cardId: card.id, id: card.id });
    }
  });

  const unique = new Map<string, DashboardWidget>();
  withDefaults.forEach((widget) => unique.set(widget.id, widget));
  return Array.from(unique.values());
}

function fallbackItemForWidget(widget: DashboardWidget, fallback: Layout, cols: number, index: number): LayoutItem {
  const base = fallback.find((item) => item.i === widget.cardId) || fallback[0]!;
  return fitItemToCols({ ...base, i: widget.id, y: base.y + Math.floor(index / DASHBOARD_CARDS.length) }, cols, index);
}

function normalizeLayoutItems(items: unknown, fallback: Layout, widgets: DashboardWidget[], cols: number): LayoutItem[] {
  const visibleWidgets = widgets.filter((widget) => !widget.hidden);
  const byId = new Map<string, LayoutItem>();
  const rawItems = Array.isArray(items) ? items : [];

  rawItems.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const candidate = item as Partial<LayoutItem>;
    if (!candidate.i || !visibleWidgets.some((widget) => widget.id === candidate.i)) return;
    const widget = visibleWidgets.find((entry) => entry.id === candidate.i)!;
    const fallbackItem = fallbackItemForWidget(widget, fallback, cols, index);

    byId.set(candidate.i, fitItemToCols({
      ...fallbackItem,
      x: Number.isFinite(candidate.x) ? Number(candidate.x) : fallbackItem.x,
      y: Number.isFinite(candidate.y) ? Number(candidate.y) : fallbackItem.y + index,
      w: Number.isFinite(candidate.w) ? Number(candidate.w) : fallbackItem.w,
      h: Number.isFinite(candidate.h) ? Number(candidate.h) : fallbackItem.h
    }, cols, index));
  });

  return visibleWidgets.map((widget, index) => byId.get(widget.id) || fallbackItemForWidget(widget, fallback, cols, index));
}

function normalizeGridLayout(layout?: unknown): StoredDashboardGridLayout {
  const defaults = defaultBreakpointLayouts();
  const source = layout && typeof layout === 'object' ? layout as { layouts?: Partial<Layouts>; updatedAt?: string; widgets?: unknown } : {};
  const legacyWidgets = !source.widgets ? defaultWidgets() : normalizeWidgets(source.widgets);
  const widgets = normalizeWidgets(legacyWidgets);

  return {
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : undefined,
    version: 3,
    widgets,
    layouts: {
      lg: normalizeLayoutItems(source.layouts?.lg, defaults.lg, widgets, DASHBOARD_COLS.lg),
      md: normalizeLayoutItems(source.layouts?.md, defaults.md, widgets, DASHBOARD_COLS.md),
      sm: normalizeLayoutItems(source.layouts?.sm, defaults.sm, widgets, DASHBOARD_COLS.sm),
      xs: normalizeLayoutItems(source.layouts?.xs, defaults.xs, widgets, DASHBOARD_COLS.xs)
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
  window.localStorage.setItem(DASHBOARD_LAYOUT_STORAGE_KEY, JSON.stringify(normalizeGridLayout(layout)));
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

function layoutWithPreset(layouts: Layouts, widgetId: string, preset: SizePresetId): Layouts {
  const size = SIZE_PRESETS[preset];
  return {
    lg: resizeLayoutItems(layouts.lg || [], widgetId, size.w, size.h, DASHBOARD_COLS.lg),
    md: resizeLayoutItems(layouts.md || [], widgetId, size.w, size.h, DASHBOARD_COLS.md),
    sm: resizeLayoutItems(layouts.sm || [], widgetId, Math.min(6, size.w), size.h, DASHBOARD_COLS.sm),
    xs: resizeLayoutItems(layouts.xs || [], widgetId, 1, Math.max(2, Math.min(size.h, 5)), DASHBOARD_COLS.xs)
  };
}

function resizeLayoutItems(items: Layout, widgetId: string, width: number, height: number, cols: number): LayoutItem[] {
  return items.map((item, index) => item.i === widgetId
    ? fitItemToCols({ ...item, w: width, h: height }, cols, index)
    : { ...item }
  );
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
  const [layoutMessage, setLayoutMessage] = useState('');
  const [openWidgetMenu, setOpenWidgetMenu] = useState<string | null>(null);
  const [widgetsPanelOpen, setWidgetsPanelOpen] = useState(false);
  const { containerRef, mounted, width } = useContainerWidth({ initialWidth: 1200 });
  const visibleWidgets = gridLayout.widgets.filter((widget) => !widget.hidden);
  const hiddenWidgets = gridLayout.widgets.filter((widget) => widget.hidden);
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
  const monthFlowTotal = summary.rec + summary.depTotal;
  const monthIncomeShare = monthFlowTotal ? Math.round((summary.rec / monthFlowTotal) * 100) : 0;
  const monthExpenseShare = monthFlowTotal ? 100 - monthIncomeShare : 0;
  const monthPieStyle = { '--month-income-share': `${monthIncomeShare}%` } as CSSProperties;

  const latestTransactions = useMemo(
    () => financeState.transacoes.slice().sort(compareTransactionsDesc).slice(0, 6),
    [financeState.transacoes]
  );
  const budgetItems = budget.items.slice().sort((a, b) => b.spent - a.spent);
  const topCategories = Object.entries(expenseCategories.catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const alerts = [
    invoices.previsto > 0 ? `${formatCurrency(invoices.previsto)} em faturas abertas/fechadas previstas para ${monthLabel(month)}.` : '',
    budget.pct >= 80 ? `Orçamento já consumiu ${budget.pct}% do limite do mês.` : '',
    metrics.commitment >= 50 ? `Despesas fixas comprometem ${metrics.commitment}% das receitas confirmadas.` : '',
    totalBalance < 0 ? 'Saldo total está negativo considerando contas e carteiras.' : ''
  ].filter(Boolean);

  useEffect(() => {
    const normalized = normalizeGridLayout(gridLayout);
    saveGridLayout(normalized);
    onDashboardLayoutChange?.(normalized as unknown as Record<string, unknown>);
  }, [gridLayout]);

  useEffect(() => {
    const nextLayout = normalizeGridLayout(dashboardLayout || loadGridLayout());
    setGridLayout((current) => (
      JSON.stringify(current) === JSON.stringify(nextLayout) ? current : nextLayout
    ));
  }, [dashboardLayout]);

  function updateGridLayout(updater: (current: StoredDashboardGridLayout) => StoredDashboardGridLayout, message = '') {
    if (!canEdit) return;
    setGridLayout((current) => normalizeGridLayout(updater(normalizeGridLayout(current))));
    if (message) {
      setLayoutMessage(message);
      window.setTimeout(() => setLayoutMessage(''), 1800);
    }
  }

  function resetCards() {
    updateGridLayout(() => normalizeGridLayout(), 'Layout padrão restaurado');
    setOpenWidgetMenu(null);
  }

  function saveLayoutNow() {
    const normalized = normalizeGridLayout({ ...gridLayout, updatedAt: new Date().toISOString() });
    setGridLayout(normalized);
    saveGridLayout(normalized);
    onDashboardLayoutChange?.(normalized as unknown as Record<string, unknown>);
    setLayoutMessage('Layout salvo');
    window.setTimeout(() => setLayoutMessage(''), 1800);
  }

  function handleGridLayoutChange(_currentLayout: Layout, allLayouts: Layouts) {
    if (!editingCards || !canEdit) return;
    setGridLayout((current) => normalizeGridLayout({ ...current, layouts: allLayouts }));
  }

  function applySizePreset(widgetId: string, preset: SizePresetId) {
    updateGridLayout((current) => ({
      ...current,
      layouts: layoutWithPreset(current.layouts, widgetId, preset)
    }), `${SIZE_PRESETS[preset].label} aplicado`);
    setOpenWidgetMenu(null);
  }

  function duplicateWidget(widget: DashboardWidget) {
    updateGridLayout((current) => {
      const nextWidget: DashboardWidget = {
        cardId: widget.cardId,
        id: `${widget.cardId}-copy-${Date.now()}`,
        title: `${DASHBOARD_CARD_MAP[widget.cardId].title} duplicado`
      };
      const layouts = Object.fromEntries(Object.entries(current.layouts).map(([breakpoint, items]) => {
        const cols = DASHBOARD_COLS[breakpoint as keyof typeof DASHBOARD_COLS] || DASHBOARD_COLS.lg;
        const source = (items || []).find((item) => item.i === widget.id) || fallbackItemForWidget(widget, defaultBreakpointLayouts()[breakpoint as keyof ReturnType<typeof defaultBreakpointLayouts>] || defaultBreakpointLayouts().lg, cols, 0);
        const duplicated = fitItemToCols({ ...source, i: nextWidget.id, x: source.x + 1, y: source.y + 1 }, cols, items?.length || 0);
        return [breakpoint, [...(items || []).map((item) => ({ ...item })), duplicated]];
      })) as Layouts;

      return { ...current, widgets: [...current.widgets, nextWidget], layouts };
    }, 'Card duplicado');
    setOpenWidgetMenu(null);
  }

  function hideWidget(widget: DashboardWidget) {
    updateGridLayout((current) => ({
      ...current,
      widgets: current.widgets.map((item) => item.id === widget.id ? { ...item, hidden: true } : item)
    }), 'Card ocultado');
    setOpenWidgetMenu(null);
  }

  function restoreWidget(widgetId: string) {
    updateGridLayout((current) => ({
      ...current,
      widgets: current.widgets.map((item) => item.id === widgetId ? { ...item, hidden: false } : item)
    }), 'Card restaurado');
  }

  function restoreAllWidgets() {
    updateGridLayout((current) => ({
      ...current,
      widgets: current.widgets.map((item) => ({ ...item, hidden: false }))
    }), 'Widgets restaurados');
  }

  function cardClass() {
    return ['modern-dashboard-card', editingCards ? 'is-editing' : ''].filter(Boolean).join(' ');
  }

  function widgetTitle(widget: DashboardWidget) {
    return widget.title || DASHBOARD_CARD_MAP[widget.cardId].title;
  }

  function renderWidgetChrome(widget: DashboardWidget) {
    if (!editingCards || !canEdit) return null;

    return (
      <div className="modern-dashboard-widget-bar">
        <button className="modern-dashboard-drag-handle" type="button" title="Arrastar card">
          <span>⋮⋮</span>
          Arrastar
        </button>
        <div className="modern-dashboard-widget-menu-wrap">
          <button
            className="modern-widget-menu-button"
            onClick={() => setOpenWidgetMenu((current) => current === widget.id ? null : widget.id)}
            type="button"
          >
            Menu
          </button>
          {openWidgetMenu === widget.id && (
            <div className="modern-widget-menu">
              <strong>{widgetTitle(widget)}</strong>
              <span>Tamanho</span>
              {(Object.keys(SIZE_PRESETS) as SizePresetId[]).map((preset) => (
                <button key={preset} onClick={() => applySizePreset(widget.id, preset)} type="button">
                  {SIZE_PRESETS[preset].label}
                </button>
              ))}
              <span>Ações</span>
              <button onClick={() => duplicateWidget(widget)} type="button">Duplicar</button>
              <button onClick={() => hideWidget(widget)} type="button">Ocultar</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDashboardCard(widget: DashboardWidget) {
    const cardId = widget.cardId;

    if (cardId === 'saldo-total') {
      return (
        <Card className={cardClass()} subtitle="Todas as contas" title="Saldo Total">
          <div className={totalBalance >= 0 ? 'modern-kpi-value modern-value-income' : 'modern-kpi-value modern-value-expense'}>{formatCurrency(totalBalance)}</div>
        </Card>
      );
    }

    if (cardId === 'receitas') {
      return (
        <Card className={cardClass()} subtitle={monthLabel(month)} title="Receitas" tone="income">
          <div className="modern-kpi-value modern-value-income">{formatCurrency(summary.rec)}</div>
        </Card>
      );
    }

    if (cardId === 'despesas') {
      return (
        <Card className={cardClass()} subtitle="Confirmadas no mês" title="Despesas" tone="expense">
          <div className="modern-kpi-value modern-value-expense">{formatCurrency(summary.depTotal)}</div>
        </Card>
      );
    }

    if (cardId === 'faturas-kpi') {
      return (
        <Card className={cardClass()} subtitle="Previstas no mês" title="Faturas">
          <div className="modern-kpi-value modern-value-transfer">{formatCurrency(invoices.previsto)}</div>
        </Card>
      );
    }

    if (cardId === 'indicadores') {
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

    if (cardId === 'visao-mes') {
      return (
        <Card className={cardClass()} subtitle={`${summary.txs.length} lançamentos confirmados`} title="Visão do Mês">
          <div className="modern-month-pie">
            <div
              aria-label={`Receitas ${monthIncomeShare}%, despesas ${monthExpenseShare}%`}
              className={`modern-month-donut ${monthFlowTotal ? '' : 'is-empty'}`}
              role="img"
              style={monthPieStyle}
            >
              <span>{monthFlowTotal ? `${monthIncomeShare}% receitas` : 'Sem dados'}</span>
            </div>
            <div className="modern-month-pie-info">
              <span>Receitas vs despesas</span>
              <div className="modern-month-pie-row">
                <i className="is-balance" />
                <span>Saldo</span>
                <strong className={summary.saldo >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(summary.saldo)}</strong>
              </div>
              <div className="modern-month-pie-row">
                <i className="is-income" />
                <span>Receitas</span>
                <strong>{formatCurrency(summary.rec)}</strong>
              </div>
              <div className="modern-month-pie-row">
                <i className="is-expense" />
                <span>Despesas</span>
                <strong>{formatCurrency(summary.depTotal)}</strong>
              </div>
              {!monthFlowTotal && <small>Sem valores confirmados neste mês.</small>}
            </div>
          </div>
        </Card>
      );
    }

    if (cardId === 'orcamento') {
      return (
        <Card className={cardClass()} subtitle={`${budget.pct}% utilizado`} title="Orçamento">
          <div className="modern-budget-total">
            <strong>{formatCurrency(budget.totalSpent)}</strong>
            <span>de {formatCurrency(budget.totalLimit)}</span>
          </div>
          <div className="modern-progress-line"><i style={{ width: `${budget.pct}%` }} /></div>
          <div className="modern-list">
            {budgetItems.map((item) => (
              <div className="modern-compact-row" key={item.category}>
                <span>{item.category}</span>
                <strong>{formatCurrency(item.spent)} / {formatCurrency(item.limit)}</strong>
              </div>
            ))}
            {!budgetItems.length && <EmptyState title="Sem orçamento" text="Cadastre limites para acompanhar o mês." />}
          </div>
        </Card>
      );
    }

    if (cardId === 'alertas') {
      return (
        <Card className={cardClass()} subtitle="Pontos que pedem atenção" title="Alertas">
          <div className="modern-list">
            {alerts.map((alert) => <div className="modern-alert-row" key={alert}>{alert}</div>)}
            {!alerts.length && <EmptyState title="Sem alertas críticos" text="Nenhum indicador ultrapassou limites de atenção." />}
          </div>
        </Card>
      );
    }

    if (cardId === 'faturas') {
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

    if (cardId === 'metas') {
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

    if (cardId === 'contas') {
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

    if (cardId === 'categorias') {
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

    if (cardId === 'acoes') {
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
                <Badge tone={tx.status === 'confirmado' ? 'success' : 'danger'}>{tx.status === 'confirmado' ? 'Confirmado' : 'Pendente'}</Badge>
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
      <div className="modern-dashboard-toolbar modern-dashboard-toolbar--premium">
        <div>
          <strong>Dashboard</strong>
          <span>{editingCards ? 'Editor premium ativo' : monthLabel(month)}</span>
        </div>
        <div className="modern-dashboard-editor-actions">
          {layoutMessage && <span className="modern-layout-save-status">{layoutMessage}</span>}
          {editingCards && <Button onClick={() => setWidgetsPanelOpen((current) => !current)} type="button" variant="ghost">Gerenciar widgets</Button>}
          {editingCards && <Button onClick={resetCards} type="button" variant="ghost">Restaurar padrão</Button>}
          {editingCards && <Button onClick={saveLayoutNow} type="button">Salvar Layout</Button>}
          <Button disabled={!canEdit} onClick={() => setEditingCards((current) => !current)} type="button" variant={editingCards ? 'primary' : 'default'}>
            {editingCards ? 'Concluir edição' : 'Editar cards'}
          </Button>
        </div>
      </div>

      {editingCards && widgetsPanelOpen && (
        <Card className="modern-widget-manager" title="Gerenciar widgets" subtitle={`${hiddenWidgets.length} oculto(s)`}>
          <div className="modern-widget-manager-grid">
            {hiddenWidgets.map((widget) => (
              <div className="modern-widget-manager-row" key={widget.id}>
                <span>{widgetTitle(widget)}</span>
                <Button onClick={() => restoreWidget(widget.id)} type="button" variant="ghost">Restaurar</Button>
              </div>
            ))}
            {!hiddenWidgets.length && <EmptyState title="Nenhum card oculto" text="Os cards ocultados aparecerão aqui para restauração." />}
          </div>
          {hiddenWidgets.length > 0 && (
            <div className="modern-form-actions">
              <Button onClick={restoreAllWidgets} type="button" variant="primary">Restaurar cards ocultos</Button>
            </div>
          )}
        </Card>
      )}

      <div className="modern-dashboard-layout-shell" ref={containerRef}>
        {mounted && (
          <ResponsiveGridLayout
            breakpoints={DASHBOARD_BREAKPOINTS}
            className={['modern-dashboard-layout-grid', editingCards ? 'is-editing' : ''].filter(Boolean).join(' ')}
            cols={DASHBOARD_COLS}
            containerPadding={[0, 0]}
            dragConfig={{
              bounded: false,
              cancel: 'button:not(.modern-dashboard-drag-handle), input, select, textarea, a, .fc-button',
              enabled: editingCards && canEdit,
              handle: '.modern-dashboard-drag-handle',
              threshold: 2
            }}
            layouts={gridLayout.layouts}
            margin={DASHBOARD_GRID_MARGIN}
            onLayoutChange={handleGridLayoutChange}
            resizeConfig={{
              enabled: editingCards && canEdit,
              handles: ['se']
            }}
            rowHeight={DASHBOARD_ROW_HEIGHT}
            width={width}
          >
            {visibleWidgets.map((widget) => (
              <div className="modern-dashboard-layout-item" key={widget.id}>
                <div className="modern-dashboard-widget">
                  {renderWidgetChrome(widget)}
                  {renderDashboardCard(widget)}
                </div>
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
