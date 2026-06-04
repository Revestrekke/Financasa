import type { Account, CreditCardInvoice, RecurringTransaction, Transaction } from '../../domain/types';

export interface CategoryState {
  despesa: string[];
  receita: string[];
}

export interface GoalState {
  atual: number;
  icone?: string;
  id: string;
  nome: string;
  prazo?: string;
  alvo: number;
}

export interface InvestmentState {
  id: string;
  nome: string;
  rent: number;
  tipo: string;
  valor: number;
}

export interface CreditCardState {
  banco: string;
  cor: string;
  conta_id: string;
  fecha_dia: number;
  final: string;
  id: string;
  limite: number;
  nome: string;
  vence_dia: number;
}

export interface ModernRecurringTransaction extends RecurringTransaction {
  conta_id: string;
  desc: string;
  dia: number;
  frequencia: 'mensal' | 'quinzenal' | 'semanal' | 'anual';
  id: string;
  tipo: 'despesa' | 'receita';
  valor: number;
}

export interface ModernFinanceState {
  alert_config?: Record<string, unknown>;
  audit_logs?: unknown[];
  categorias: CategoryState;
  contas: Account[];
  cartoes: CreditCardState[];
  dashboardMes?: string;
  faturas_cartao: CreditCardInvoice[];
  filtroTx?: string;
  investimentos: InvestmentState[];
  metas: GoalState[];
  orcamento: Record<string, number>;
  recorrentes: ModernRecurringTransaction[];
  tipoLanc?: string;
  transacoes: Transaction[];
}

export function createModernInitialState(): ModernFinanceState {
  return {
    alert_config: { saldo_minimo: 0 },
    audit_logs: [],
    categorias: {
      despesa: ['Aluguel', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Contas', 'Outros'],
      receita: ['Salário', 'Freelance', 'Investimentos', 'Outras Receitas']
    },
    contas: [],
    cartoes: [],
    dashboardMes: new Date().toISOString().slice(0, 7),
    faturas_cartao: [],
    filtroTx: 'todas',
    investimentos: [],
    metas: [],
    orcamento: {},
    recorrentes: [],
    tipoLanc: 'despesa',
    transacoes: []
  };
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function hydrateModernFinanceState(raw?: Partial<ModernFinanceState> | null): ModernFinanceState {
  const initial = createModernInitialState();
  if (!raw || typeof raw !== 'object') return initial;

  return {
    ...initial,
    ...raw,
    alert_config: raw.alert_config || initial.alert_config,
    audit_logs: Array.isArray(raw.audit_logs) ? raw.audit_logs : initial.audit_logs,
    categorias: {
      despesa: Array.isArray(raw.categorias?.despesa) ? raw.categorias.despesa : initial.categorias.despesa,
      receita: Array.isArray(raw.categorias?.receita) ? raw.categorias.receita : initial.categorias.receita
    },
    contas: Array.isArray(raw.contas) ? raw.contas : initial.contas,
    cartoes: Array.isArray(raw.cartoes) ? raw.cartoes : initial.cartoes,
    faturas_cartao: Array.isArray(raw.faturas_cartao) ? raw.faturas_cartao : initial.faturas_cartao,
    investimentos: Array.isArray(raw.investimentos) ? raw.investimentos : initial.investimentos,
    metas: Array.isArray(raw.metas) ? raw.metas : initial.metas,
    orcamento: raw.orcamento && typeof raw.orcamento === 'object' ? raw.orcamento : initial.orcamento,
    recorrentes: Array.isArray(raw.recorrentes) ? raw.recorrentes : initial.recorrentes,
    transacoes: Array.isArray(raw.transacoes) ? raw.transacoes : initial.transacoes
  };
}
