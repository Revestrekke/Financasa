import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Responsive, useContainerWidth } from 'react-grid-layout';

const CARD_IDS = [
  'saldo-total',
  'receitas-mes',
  'despesas-mes',
  'receitas-despesas',
  'visao-mes',
  'despesas-categoria',
  'metas',
  'contas-carteiras',
  'gastos-categoria',
  'planejamento',
  'acoes-rapidas',
  'ultimas-transacoes'
];

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const COLS = { lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 };

const DEFAULT_LG_LAYOUT = [
  { i: 'saldo-total', x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'receitas-mes', x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'despesas-mes', x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: 'receitas-despesas', x: 0, y: 3, w: 6, h: 7, minW: 3, minH: 4 },
  { i: 'visao-mes', x: 6, y: 3, w: 4, h: 7, minW: 3, minH: 4 },
  { i: 'despesas-categoria', x: 10, y: 3, w: 2, h: 7, minW: 2, minH: 4 },
  { i: 'gastos-categoria', x: 0, y: 10, w: 8, h: 7, minW: 3, minH: 4 },
  { i: 'planejamento', x: 8, y: 10, w: 4, h: 7, minW: 2, minH: 4 },
  { i: 'acoes-rapidas', x: 0, y: 17, w: 8, h: 5, minW: 3, minH: 3 },
  { i: 'ultimas-transacoes', x: 8, y: 17, w: 4, h: 5, minW: 2, minH: 3 },
  { i: 'metas', x: 0, y: 22, w: 6, h: 5, minW: 2, minH: 3 },
  { i: 'contas-carteiras', x: 6, y: 22, w: 6, h: 5, minW: 2, minH: 3 }
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

function loadLayouts(userId) {
  try {
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
          <div className="legend"><span><span className="dot" style={{ background: 'var(--green)' }}></span>Receitas</span><span><span className="dot" style={{ background: 'var(--red)' }}></span>Despesas</span></div>
        </div>
        <select id="range-chart" className="dashboard-card-action" onChange={() => window.renderDashboard?.()}><option value="6">Últimos 6 meses</option><option value="12">Últimos 12 meses</option></select>
      </div>
      <div className="chart-box"><canvas id="bar-chart"></canvas></div>
    </div>
  );
}

function CategoryExpenseChart() {
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <div className="card-title">Despesas por Categoria</div>
          <div className="caption">Ranking do mês atual</div>
        </div>
        <select className="dashboard-card-action" onChange={() => window.renderDashboard?.()}><option>Este mês</option></select>
      </div>
      <div className="chart-box"><canvas id="cat-expense-chart"></canvas></div>
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
      <div className="card-head"><div className="card-title">Gastos por Categoria</div><select className="dashboard-card-action" onChange={() => window.renderDashboard?.()}><option>Este mês</option></select></div>
      <div className="category-donut-layout">
        <div className="donut-center"><canvas id="cat-donut"></canvas><div className="donut-text"><div id="cat-total">R$ 0,00<span>Total</span></div></div></div>
        <div className="breakdown category-breakdown" id="cat-breakdown"></div>
      </div>
    </div>
  );
}

function PlanningCard() {
  return (
    <div className="card">
      <div className="card-title">Planejamento Financeiro</div>
      <p className="caption" id="planning-copy" style={{ margin: '10px 0 14px' }}>Você está no caminho certo.</p>
      <div className="donut-center saving-donut"><canvas id="saving-donut"></canvas><div className="donut-text"><div id="saving-rate">0%<span>Poupança</span></div></div></div>
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
        <button className="quick-action dashboard-card-action" onClick={() => window.toast?.('Transferências em breve', 'success')}><span className="quick-icon">⇄</span>Transferência</button>
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
  'despesas-categoria': CategoryExpenseChart,
  metas: GoalsCard,
  'contas-carteiras': AccountsCard,
  'gastos-categoria': CategoryTotalCard,
  planejamento: PlanningCard,
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
    return () => {
      if (window.toggleDashboardLayoutEdit) delete window.toggleDashboardLayoutEdit;
    };
  }, []);

  useEffect(() => {
    document.getElementById('top-layout-edit')?.classList.toggle('active', editing && desktop);
  }, [editing, desktop]);

  const cards = useMemo(() => CARD_IDS.map((id) => {
    const Card = CARD_RENDERERS[id];
    return (
      <div key={id} className={`dashboard-layout-card ${editing && desktop ? 'is-editing' : ''}`}>
        <DragHandle editing={editing && desktop} />
        <Card />
      </div>
    );
  }), [editing, desktop]);

  function handleLayoutChange(_layout, allLayouts) {
    const nextLayouts = normalizeLayouts(allLayouts);
    setLayouts(nextLayouts);
    saveLayouts(userId, nextLayouts);
  }

  return (
    <>
      <div ref={containerRef}>
        {mounted && (
          <Responsive
            className="dashboard-editable-grid"
            layouts={layouts}
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
            draggableHandle=".dashboard-drag-handle"
            draggableCancel=".dashboard-card-action, input, select, button, textarea, canvas, a"
            isDraggable={editing && desktop}
            isResizable={editing && desktop}
            resizeHandles={['s', 'e', 'se']}
            onLayoutChange={handleLayoutChange}
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
