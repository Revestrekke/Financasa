import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Responsive, useContainerWidth } from 'react-grid-layout';

const CARD_IDS = [
  'saldo-total',
  'receitas-mes',
  'despesas-mes',
  'receitas-despesas',
  'indicadores-executivos',
  'visao-mes',
  'orcamento',
  'alertas',
  'faturas-cartao',
  'metas',
  'contas-carteiras',
  'gastos-categoria',
  'acoes-rapidas',
  'ultimas-transacoes'
];

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 };

const DEFAULT_LG_LAYOUT = [
  { i: 'saldo-total', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'receitas-mes', x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'despesas-mes', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'receitas-despesas', x: 0, y: 3, w: 5, h: 7, minW: 3, minH: 4 },
  { i: 'indicadores-executivos', x: 5, y: 3, w: 3, h: 7, minW: 3, minH: 4 },
  { i: 'visao-mes', x: 8, y: 3, w: 4, h: 7, minW: 3, minH: 4 },
  { i: 'orcamento', x: 0, y: 10, w: 4, h: 7, minW: 3, minH: 4 },
  { i: 'gastos-categoria', x: 4, y: 10, w: 5, h: 7, minW: 3, minH: 4 },
  { i: 'alertas', x: 9, y: 10, w: 3, h: 7, minW: 2, minH: 4 },
  { i: 'acoes-rapidas', x: 0, y: 17, w: 4, h: 6, minW: 3, minH: 3 },
  { i: 'ultimas-transacoes', x: 4, y: 17, w: 4, h: 6, minW: 2, minH: 3 },
  { i: 'metas', x: 8, y: 17, w: 4, h: 6, minW: 2, minH: 3 },
  { i: 'contas-carteiras', x: 0, y: 23, w: 8, h: 6, minW: 2, minH: 3 },
  { i: 'faturas-cartao', x: 8, y: 23, w: 4, h: 6, minW: 3, minH: 3 }
];

function cloneLayout(layout) {
  return layout.map((item) => ({ ...item }));
}

function stackedLayout() {
  let y = 0;
  return DEFAULT_LG_LAYOUT.map((item) => {
    const h = Math.max(item.h, 4);
    const stacked = {
      ...item,
      x: 0,
      y,
      w: 1,
      h,
      minW: 1
    };
    y += h;
    return stacked;
  });
}

function defaultLayouts() {
  return {
    lg: cloneLayout(DEFAULT_LG_LAYOUT),
    md: cloneLayout(DEFAULT_LG_LAYOUT).map((item) => ({ ...item, x: Math.min(item.x, 6), w: Math.min(item.w, 5) })),
    sm: cloneLayout(DEFAULT_LG_LAYOUT).map((item, index) => ({ ...item, x: index % 2 ? 3 : 0, y: Math.floor(index / 2) * 6, w: 3 })),
    xs: stackedLayout(),
    xxs: stackedLayout()
  };
}

function normalizeLayouts(layouts) {
  const fallback = defaultLayouts();
  const normalized = {};
  Object.keys(fallback).forEach((breakpoint) => {
    const source = Array.isArray(layouts?.[breakpoint]) ? layouts[breakpoint] : fallback[breakpoint];
    const byId = new Map(source.filter((item) => CARD_IDS.includes(item.i)).map((item) => [item.i, item]));
    normalized[breakpoint] = fallback[breakpoint].map((fallbackItem) => {
      const savedItem = byId.get(fallbackItem.i) || {};
      return {
        ...fallbackItem,
        x: Number.isFinite(savedItem.x) ? savedItem.x : fallbackItem.x,
        y: Number.isFinite(savedItem.y) ? savedItem.y : fallbackItem.y,
        w: Math.max(fallbackItem.minW || 1, Number.isFinite(savedItem.w) ? savedItem.w : fallbackItem.w),
        h: Math.max(fallbackItem.minH || 1, Number.isFinite(savedItem.h) ? savedItem.h : fallbackItem.h)
      };
    });
  });
  return normalized;
}

function storageKey(userId) {
  return `financasa-dashboard-layout-${userId || 'anonimo'}`;
}

function removeLegacyCardsFromStorage(userId) {
  try {
    const key = storageKey(userId);
    const raw = window.localStorage.getItem(key);
    if (!raw || (!raw.includes('planejamento') && !raw.includes('despesas-categoria'))) return;
    const layouts = JSON.parse(raw);
    Object.keys(layouts || {}).forEach((breakpoint) => {
      if (Array.isArray(layouts[breakpoint])) {
        layouts[breakpoint] = layouts[breakpoint].filter((item) => CARD_IDS.includes(item.i));
      }
    });
    window.localStorage.setItem(key, JSON.stringify(layouts));
  } catch (error) {
    console.warn('Não foi possível limpar cards antigos do dashboard:', error);
  }
}

function loadLayouts(userId) {
  try {
    removeLegacyCardsFromStorage(userId);
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? normalizeLayouts(JSON.parse(raw)) : defaultLayouts();
  } catch (error) {
    console.warn('Layout do dashboard inválido:', error);
    return defaultLayouts();
  }
}

function saveLayouts(userId, layouts) {
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(normalizeLayouts(layouts)));
  } catch (error) {
    console.warn('Não foi possível salvar o layout do dashboard:', error);
  }
}

function scheduleDashboardRender() {
  window.clearTimeout(window.__financasaDashboardRenderTimer);
  window.__financasaDashboardRenderTimer = window.setTimeout(() => {
    window.renderDashboard?.();
  }, 80);
}

function useDesktopMode() {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 1040);
  useEffect(() => {
    const onResize = () => setDesktop(window.innerWidth >= 1040);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return desktop;
}

function DragHandle({ editing }) {
  return <div className="dashboard-drag-handle" aria-hidden="true">{editing ? '::' : ''}</div>;
}

function KpiSaldo() {
  return (
    <div className="kpi-card clickable-card" onClick={() => window.navTo?.('contas')}>
      <div className="kpi-head"><div className="kpi-icon">▣</div><div><div className="kpi-label">Saldo Total</div><div className="kpi-value" id="kpi-saldo">R$ 0,00</div><div className="kpi-sub">Todas as contas</div></div></div>
      <div className="trend up" id="kpi-saldo-trend">▲ 0,0%</div>
      <canvas className="spark" id="spark-saldo"></canvas>
    </div>
  );
}

function KpiReceitas() {
  return (
    <div className="kpi-card clickable-card" onClick={() => window.goToTransactionsFilter?.('receita')}>
      <div className="kpi-head"><div className="kpi-icon">↑</div><div><div className="kpi-label">Receitas do Mês</div><div className="kpi-value" id="kpi-receita">R$ 0,00</div><div className="kpi-sub">vs mês anterior</div></div></div>
      <div className="trend up" id="kpi-receita-trend">▲ 0,0%</div>
      <canvas className="spark" id="spark-receita"></canvas>
    </div>
  );
}

function KpiDespesas() {
  return (
    <div className="kpi-card clickable-card" onClick={() => window.goToTransactionsFilter?.('despesa')}>
      <div className="kpi-head"><div className="kpi-icon red">↓</div><div><div className="kpi-label">Despesas do Mês</div><div className="kpi-value" id="kpi-despesa">R$ 0,00</div><div className="kpi-sub">vs mês anterior</div></div></div>
      <div className="trend down" id="kpi-despesa-trend">▼ 0,0%</div>
      <canvas className="spark" id="spark-despesa"></canvas>
    </div>
  );
}

function MonthOverview() {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 16 }}>Visão Geral do Mês</div>
      <div className="donut-layout">
        <div className="donut-center"><canvas id="month-donut"></canvas><div className="donut-text"><div id="month-rate">0%<span>Poupança</span></div></div></div>
        <div className="breakdown" id="month-breakdown"></div>
      </div>
    </div>
  );
}

function RevenueExpenseChart() {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Receitas vs Despesas</div>
          <div className="caption">Últimos 6 meses</div>
        </div>
      </div>
      <div className="chart-box"><canvas id="bar-chart"></canvas></div>
    </div>
  );
}

function BudgetCard() {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Orçamento</div>
          <div className="caption" id="dash-budget-caption">Mês atual</div>
        </div>
        <button className="btn btn-ghost dashboard-card-action" onClick={() => window.navTo?.('orcamento')}>Ver</button>
      </div>
      <div className="budget-summary">
        <div className="budget-total">
          <span id="dash-budget-used">R$ 0,00</span>
          <small>de <strong id="dash-budget-total">R$ 0,00</strong></small>
        </div>
        <div className="progress budget-progress"><span id="dash-budget-progress"></span></div>
        <div className="cash-line budget-balance"><span id="dash-budget-status-label">Restante</span><strong id="dash-budget-available">R$ 0,00</strong></div>
        <div className="budget-list" id="dash-budget-list"></div>
      </div>
    </div>
  );
}

function ExecutiveMetricsCard() {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">Indicadores Estratégicos</div><div className="caption">Saúde financeira</div></div></div>
      <div className="metric-stack" id="executive-metrics"></div>
    </div>
  );
}

function AlertsCard() {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">Alertas</div><div className="caption">Próximos riscos</div></div></div>
      <div className="alert-list" id="dash-alerts"></div>
    </div>
  );
}

function CreditCardInvoicesCard() {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">Faturas dos Cartões</div><div className="caption" id="dash-card-invoices-caption">Mês selecionado</div></div><button className="btn btn-ghost dashboard-card-action" onClick={() => window.navTo?.('cartoes')}>Ver</button></div>
      <div className="invoice-list" id="dash-card-invoices"></div>
    </div>
  );
}

function GoalsCard() {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Metas</div><button className="btn btn-ghost dashboard-card-action" onClick={() => window.navTo?.('metas')}>Ver todas</button></div>
      <div className="goal-list" id="dash-goals"></div>
    </div>
  );
}

function AccountsCard() {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Contas e Carteiras</div><button className="btn btn-ghost dashboard-card-action" onClick={() => window.navTo?.('contas')}>Ver todas</button></div>
      <div className="account-list" id="dash-accounts"></div>
      <div className="cash-line" style={{ borderBottom: 0, fontWeight: 800 }}><span>Total</span><span id="dash-total">R$ 0,00</span></div>
    </div>
  );
}

function CategoryTotalCard() {
  return (
    <div className="card">
      <div className="card-head"><div><div className="card-title">Gastos por Categoria</div><div className="caption">Mês selecionado no dashboard</div></div></div>
      <div className="category-donut-layout">
        <div className="donut-center"><canvas id="cat-donut"></canvas><div className="donut-text"><div id="cat-total">R$ 0,00<span>Total</span></div></div></div>
        <div className="breakdown category-breakdown" id="cat-breakdown"></div>
      </div>
    </div>
  );
}

function QuickActionsCard() {
  return (
    <div className="card">
      <div className="card-title" style={{ marginBottom: 14 }}>Ações Rápidas</div>
      <div className="quick-grid">
        <button className="quick-action dashboard-card-action" onClick={() => window.navTo?.('lancamentos')}><span className="quick-icon">+</span>Novo Lançamento</button>
        <button className="quick-action dashboard-card-action" onClick={() => { window.navTo?.('metas'); window.showAddMeta?.(); }}><span className="quick-icon">◎</span>Nova Meta</button>
        <button className="quick-action dashboard-card-action" onClick={() => { window.navTo?.('contas'); window.showAddConta?.(); }}><span className="quick-icon">▣</span>Nova Conta</button>
        <button className="quick-action dashboard-card-action" onClick={() => window.openTransferModal?.()}><span className="quick-icon">⇄</span>Transferência</button>
        <button className="quick-action dashboard-card-action" onClick={() => window.navTo?.('relatorios')}><span className="quick-icon">▤</span>Relatório</button>
        <button className="quick-action dashboard-card-action" onClick={() => window.navTo?.('orcamento')}><span className="quick-icon">◔</span>Orçamento</button>
        <button className="quick-action dashboard-card-action" onClick={() => window.navTo?.('investimentos')}><span className="quick-icon">↗</span>Investir</button>
        <button className="quick-action dashboard-card-action" onClick={() => window.toast?.('Importação em breve', 'success')}><span className="quick-icon">☁</span>Importar Extrato</button>
      </div>
    </div>
  );
}

function RecentTransactionsCard() {
  return (
    <div className="card">
      <div className="card-head"><div className="card-title">Últimas Transações</div><button className="btn btn-ghost dashboard-card-action" onClick={() => window.navTo?.('transacoes')}>Ver todas</button></div>
      <div className="tx-list" id="recent-list"></div>
    </div>
  );
}

const CARD_RENDERERS = {
  'saldo-total': KpiSaldo,
  'receitas-mes': KpiReceitas,
  'despesas-mes': KpiDespesas,
  'visao-mes': MonthOverview,
  'receitas-despesas': RevenueExpenseChart,
  'indicadores-executivos': ExecutiveMetricsCard,
  orcamento: BudgetCard,
  alertas: AlertsCard,
  'faturas-cartao': CreditCardInvoicesCard,
  metas: GoalsCard,
  'contas-carteiras': AccountsCard,
  'gastos-categoria': CategoryTotalCard,
  'acoes-rapidas': QuickActionsCard,
  'ultimas-transacoes': RecentTransactionsCard
};

function DashboardLayoutApp({ userId }) {
  const desktop = useDesktopMode();
  const { width, containerRef, mounted } = useContainerWidth();
  const [editing, setEditing] = useState(false);
  const [layouts, setLayouts] = useState(() => loadLayouts(userId));
  const lastUserId = useRef(userId);

  useEffect(() => {
    if (lastUserId.current !== userId) {
      lastUserId.current = userId;
      setLayouts(loadLayouts(userId));
      setEditing(false);
    }
  }, [userId]);

  useEffect(() => {
    scheduleDashboardRender();
  }, [layouts, editing, desktop]);

  useEffect(() => {
    window.toggleDashboardLayoutEdit = () => setEditing((value) => !value);
    window.saveDashboardLayout = () => {
      saveLayouts(userId, layouts);
      window.toast?.('Layout salvo', 'success');
    };
    window.resetDashboardLayout = () => {
      const nextLayouts = defaultLayouts();
      setLayouts(nextLayouts);
      saveLayouts(userId, nextLayouts);
      scheduleDashboardRender();
      window.toast?.('Layout restaurado', 'success');
    };
    return () => {
      if (window.toggleDashboardLayoutEdit) delete window.toggleDashboardLayoutEdit;
      if (window.saveDashboardLayout) delete window.saveDashboardLayout;
      if (window.resetDashboardLayout) delete window.resetDashboardLayout;
    };
  }, [layouts, userId]);

  useEffect(() => {
    document.getElementById('top-layout-edit')?.classList.toggle('active', editing && desktop);
  }, [editing, desktop]);

  const editable = editing && desktop;

  const activeLayouts = useMemo(() => {
    const normalized = normalizeLayouts(layouts);
    return Object.fromEntries(Object.entries(normalized).map(([breakpoint, items]) => [
      breakpoint,
      items.map((item) => ({
        ...item,
        static: !editable,
        isDraggable: editable,
        isResizable: editable
      }))
    ]));
  }, [layouts, editable]);

  const cards = useMemo(() => CARD_IDS.map((id) => {
    const Card = CARD_RENDERERS[id];
    return (
      <div key={id} className={`dashboard-layout-card ${editable ? 'is-editing' : ''}`}>
        <DragHandle editing={editable} />
        <Card />
      </div>
    );
  }), [editable]);

  function handleLayoutChange(_layout, allLayouts) {
    if (!editable) return;
    const nextLayouts = normalizeLayouts(allLayouts);
    setLayouts(nextLayouts);
    saveLayouts(userId, nextLayouts);
  }

  function preventLockedInteraction(_layout, _oldItem, _newItem, _placeholder, event) {
    if (editable) return true;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    return false;
  }

  return (
    <>
      <div ref={containerRef}>
        {mounted && (
          <Responsive
            className={`dashboard-editable-grid ${editable ? 'is-editing' : 'is-locked'}`}
            layouts={activeLayouts}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            width={width}
            rowHeight={38}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            compactType="vertical"
            preventCollision={false}
            isBounded
            useCSSTransforms
            draggableHandle={editable ? '.dashboard-drag-handle' : '.dashboard-drag-disabled'}
            draggableCancel={editable ? '.dashboard-card-action, input, select, button, textarea, canvas, a' : '.dashboard-layout-card, .card, .kpi-card, input, select, button, textarea, canvas, a'}
            isDraggable={editable}
            isResizable={editable}
            resizeHandles={editable ? ['s', 'e', 'se'] : []}
            onLayoutChange={handleLayoutChange}
            onDragStart={preventLockedInteraction}
            onResizeStart={preventLockedInteraction}
            onDragStop={scheduleDashboardRender}
            onResize={scheduleDashboardRender}
            onResizeStop={scheduleDashboardRender}
            onBreakpointChange={scheduleDashboardRender}
            onWidthChange={scheduleDashboardRender}
          >
            {cards}
          </Responsive>
        )}
      </div>
    </>
  );
}

let root = null;

window.mountDashboardLayout = function mountDashboardLayout(userId = 'anonimo') {
  const el = document.getElementById('dashboard-layout-root');
  if (!el) return;
  if (!root) root = createRoot(el);
  root.render(<DashboardLayoutApp userId={userId} />);
};

window.refreshDashboardLayout = scheduleDashboardRender;
