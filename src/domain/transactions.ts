import type { Transaction } from './types';

export type TransactionFilterKind = 'todas' | 'receitas' | 'despesas' | 'transferencias';

export function normalizeTransactionType(tipo?: string): string {
  if (tipo === 'transferência' || tipo === 'transferencia') return 'transferencia_saida';
  return tipo || 'despesa';
}

export function getTransactionDate(tx: Transaction): string {
  return tx.data_movimento || tx.data || '';
}

export function getTransactionDescription(tx: Transaction): string {
  return tx.descricao ?? tx.desc ?? '';
}

export function transactionSignedAmount(tx: Transaction): number {
  if (tx.status && tx.status !== 'confirmado') return 0;
  const value = Number(tx.valor) || 0;
  if (['receita', 'transferencia_entrada'].includes(String(tx.tipo))) return value;
  if (['despesa', 'transferencia_saida'].includes(String(tx.tipo))) return -value;
  return 0;
}

export function compareTransactionsDesc(a: Transaction, b: Transaction): number {
  const dateOrder = getTransactionDate(b).localeCompare(getTransactionDate(a));
  if (dateOrder) return dateOrder;
  const createdOrder = String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''));
  if (createdOrder) return createdOrder;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

export function isTransferTransaction(tx: Transaction): boolean {
  return ['transferencia_saida', 'transferencia_entrada'].includes(String(tx.tipo));
}

export function transactionMatchesKind(tx: Transaction, kind: TransactionFilterKind): boolean {
  const type = String(tx.tipo || '');
  if (kind === 'todas') return true;
  if (kind === 'transferencias') return isTransferTransaction(tx);
  if (kind === 'receitas') return type === 'receita';
  return type === 'despesa';
}

export function filterTransactions(
  transactions: Transaction[],
  filters: { category?: string; kind?: TransactionFilterKind; month?: string; search?: string }
): Transaction[] {
  const kind = filters.kind || 'todas';
  const search = (filters.search || '').trim().toLowerCase();

  return transactions.filter((tx) => {
    if (!transactionMatchesKind(tx, kind)) return false;
    if (filters.month && !getTransactionDate(tx).startsWith(filters.month)) return false;
    if (filters.category && tx.categoria !== filters.category) return false;
    if (!search) return true;

    const haystack = [
      getTransactionDescription(tx),
      tx.categoria,
      tx.conta,
      tx.tags,
      tx.status,
      tx.tipo
    ].filter(Boolean).join(' ').toLowerCase();

    return haystack.includes(search);
  });
}

export function confirmedTransactions(transactions: Transaction[], month?: string): Transaction[] {
  return transactions.filter((tx) => {
    if (tx.status !== 'confirmado') return false;
    return month ? getTransactionDate(tx).startsWith(month) : true;
  });
}
