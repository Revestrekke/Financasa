import type { Account, Transaction } from './types';
import { getTransactionDate, transactionSignedAmount } from './transactions';

export function calculateAccountBalance(account: Account, transactions: Transaction[], untilDate: string | null = null): number {
  const base = Number(account?.saldo_inicial) || 0;
  const movement = transactions.reduce((sum, tx) => {
    const sameAccount = String(tx.conta_id || '') === String(account?.id) || (!tx.conta_id && tx.conta === account?.nome);
    if (!sameAccount) return sum;
    if (untilDate && getTransactionDate(tx) > untilDate) return sum;
    return sum + transactionSignedAmount(tx);
  }, 0);
  return base + movement;
}

export function getSaldoTotal(accounts: Account[], transactions: Transaction[], untilDate: string | null = null): number {
  return accounts
    .filter((account) => account.ativo !== false)
    .reduce((sum, account) => sum + calculateAccountBalance(account, transactions, untilDate), 0);
}
