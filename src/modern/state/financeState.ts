import type { Account, RecurringTransaction, Transaction } from '../../domain/types';

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
  categorias: CategoryState;
  contas: Account[];
  investimentos: InvestmentState[];
  metas: GoalState[];
  recorrentes: ModernRecurringTransaction[];
  transacoes: Transaction[];
}

export function createModernInitialState(): ModernFinanceState {
  return {
    categorias: {
      despesa: ['Aluguel', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Contas', 'Outros'],
      receita: ['Salário', 'Freelance', 'Investimentos', 'Outras Receitas']
    },
    contas: [
      { id: 'bb', nome: 'Banco do Brasil', tipo: 'Conta corrente', saldo_inicial: 1200, ativo: true },
      { id: 'caixa', nome: 'Caixa', tipo: 'Conta corrente', saldo_inicial: -150, ativo: true }
    ],
    investimentos: [
      { id: 'tesouro', nome: 'Tesouro Selic', tipo: 'Renda fixa', valor: 2500, rent: 1.2 }
    ],
    metas: [
      { id: 'reserva', nome: 'Reserva de emergência', atual: 1800, alvo: 6000, prazo: '2026-12-31', icone: '◎' }
    ],
    recorrentes: [
      { id: 'aluguel', desc: 'Aluguel', valor: 1200, tipo: 'despesa', categoria: 'Aluguel', conta_id: 'bb', frequencia: 'mensal', dia: 5 }
    ],
    transacoes: [
      { id: 'tx-salario', tipo: 'receita', categoria: 'Salário', valor: 4500, status: 'confirmado', conta_id: 'bb', data: '2026-06-03', created_at: '2026-06-03T09:00:00Z' },
      { id: 'tx-transfer-out', tipo: 'transferencia_saida', categoria: 'Transferência', valor: 200, status: 'confirmado', conta_id: 'bb', data: '2026-06-03', created_at: '2026-06-03T10:00:00Z', transfer_id: 'transfer-bb-caixa', descricao: 'Transferência para Caixa' },
      { id: 'tx-transfer-in', tipo: 'transferencia_entrada', categoria: 'Transferência', valor: 200, status: 'confirmado', conta_id: 'caixa', data: '2026-06-03', created_at: '2026-06-03T10:00:01Z', transfer_id: 'transfer-bb-caixa', descricao: 'Transferência recebida' },
      { id: 'tx-mercado', tipo: 'despesa', categoria: 'Alimentação', valor: 120, status: 'confirmado', conta_id: 'bb', data: '2026-06-02', created_at: '2026-06-02T12:00:00Z' }
    ]
  };
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
