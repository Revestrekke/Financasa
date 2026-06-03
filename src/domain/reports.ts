import type { CreditCardInvoice, FinanceState, RecurringTransaction, Transaction } from './types';
import { getSaldoTotal } from './accounts';
import { getCreditCardInvoiceSummary } from './creditCards';
import { getExpenseCategoryMap } from './budget';
import { confirmedTransactions, getTransactionDescription } from './transactions';

export function getMesSummary(state: Pick<FinanceState, 'transacoes' | 'faturas_cartao'>, month: string) {
  const txs = confirmedTransactions(state.transacoes, month);
  const rec = txs.filter((tx) => tx.tipo === 'receita').reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);
  const dep = txs.filter((tx) => tx.tipo === 'despesa').reduce((sum, tx) => sum + (Number(tx.valor) || 0), 0);
  const cardSummary = getCreditCardInvoiceSummary(state.faturas_cartao, month);
  const depPrevista = cardSummary.previsto;
  const depTotal = dep;
  return { txs, rec, dep, depPrevista, depTotal, cardSummary, saldo: rec - depTotal };
}

export function isFixedExpense(tx: Transaction, recurring: RecurringTransaction[] = []): boolean {
  const category = String(tx.categoria || '').toLowerCase();
  const description = String(getTransactionDescription(tx) || '').toLowerCase();
  return recurring.some((item) => item.tipo === 'despesa' && (item.categoria === tx.categoria || String(item.desc || '').toLowerCase() === description))
    || ['aluguel', 'contas', 'educação', 'saúde'].some((term) => category.includes(term));
}

export function getFixedVariableExpenses(state: Pick<FinanceState, 'transacoes' | 'faturas_cartao'> & { recorrentes?: RecurringTransaction[] }, month: string) {
  const { txs, depPrevista } = getMesSummary(state, month);
  const totals = txs.filter((tx) => tx.tipo === 'despesa').reduce(
    (acc, tx) => {
      acc[isFixedExpense(tx, state.recorrentes) ? 'fixas' : 'variaveis'] += Number(tx.valor) || 0;
      return acc;
    },
    { fixas: 0, variaveis: 0 }
  );
  totals.variaveis += depPrevista;
  return totals;
}

export function getTopExpenseCategory(transactions: Transaction[], month: string) {
  const { catMap, depTotal } = getExpenseCategoryMap(transactions, month);
  const [categoria, valor] = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] || ['Sem gastos', 0];
  return { categoria, valor, pct: depTotal ? Math.round((valor / depTotal) * 100) : 0 };
}

export function getStrategicMetrics(state: FinanceState, month: string) {
  const current = getMesSummary(state, month);
  const fixed = getFixedVariableExpenses(state, month);
  const total = getSaldoTotal(state.contas, state.transacoes);
  return {
    current,
    total,
    fixed,
    commitment: current.rec ? Math.round((fixed.fixas / current.rec) * 100) : 0,
    savingsRate: current.rec ? Math.round(((current.rec - current.depTotal) / current.rec) * 100) : 0,
    topCategory: getTopExpenseCategory(state.transacoes, month),
    netWorth: total
  };
}

export function summarizeInvoices(invoices: CreditCardInvoice[], month: string) {
  return getCreditCardInvoiceSummary(invoices, month);
}
