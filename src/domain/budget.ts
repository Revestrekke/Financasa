import type { Transaction } from './types';
import { getTransactionDate } from './transactions';

export function getExpenseCategoryMap(transactions: Transaction[], month: string) {
  const catMap: Record<string, number> = {};
  transactions
    .filter((tx) => tx.status === 'confirmado' && tx.tipo === 'despesa' && getTransactionDate(tx).startsWith(month))
    .forEach((tx) => {
      const category = tx.categoria || tx.categoria_id || 'Sem categoria';
      catMap[category] = (catMap[category] || 0) + (Number(tx.valor) || 0);
    });
  const depTotal = Object.values(catMap).reduce((sum, value) => sum + value, 0);
  return { catMap, depTotal };
}

export function getBudgetItems(budget: Record<string, number | string>, transactions: Transaction[], month: string) {
  const { catMap } = getExpenseCategoryMap(transactions, month);
  return Object.entries(budget)
    .map(([category, limit]) => ({
      category,
      limit: Number(limit) || 0,
      spent: catMap[category] || 0
    }))
    .filter((item) => item.limit > 0);
}

export function getBudgetSummary(budget: Record<string, number | string>, transactions: Transaction[], month: string) {
  const items = getBudgetItems(budget, transactions, month);
  const totalLimit = items.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = items.reduce((sum, item) => sum + item.spent, 0);
  return {
    items,
    totalLimit,
    totalSpent,
    available: totalLimit - totalSpent,
    pct: totalLimit ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0
  };
}
