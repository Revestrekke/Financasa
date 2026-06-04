import type { CreditCardInvoice, CreditCardPurchase, Transaction } from './types';

export const MANUAL_INVOICE_PURCHASE_ID = '__manual_invoice_value__';

export function getCreditCardInvoiceTotal(invoice?: CreditCardInvoice | null): number {
  const purchases = Array.isArray(invoice?.compras) ? invoice.compras : [];
  if (purchases.length) return purchases.reduce((sum, purchase) => sum + (Number(purchase.valor) || 0), 0);
  return Number(invoice?.valor) || 0;
}

export function getInvoiceCategory(invoice?: CreditCardInvoice | null): string {
  return invoice?.categoria || invoice?.categoria_id || 'Sem categoria';
}

export function createManualInvoicePurchase(invoice: CreditCardInvoice): CreditCardPurchase & { manual: true } {
  return {
    id: MANUAL_INVOICE_PURCHASE_ID,
    descricao: invoice.descricao || 'Fatura avulsa',
    valor: Number(invoice.valor) || 0,
    categoria: getInvoiceCategory(invoice),
    categoria_id: getInvoiceCategory(invoice),
    data: invoice.mes_competencia ? `${invoice.mes_competencia}-01` : '',
    manual: true
  };
}

export function getCreditCardInvoicePurchases(invoice?: CreditCardInvoice | null): CreditCardPurchase[] {
  const purchases = Array.isArray(invoice?.compras) ? invoice.compras : [];
  if (purchases.length) return purchases;
  return invoice && getCreditCardInvoiceTotal(invoice) !== 0 ? [createManualInvoicePurchase(invoice)] : [];
}

export function getCreditCardInvoicesForMonth(invoices: CreditCardInvoice[], month: string): CreditCardInvoice[] {
  return invoices.filter((invoice) => invoice.status !== 'cancelado' && invoice.mes_pagamento === month);
}

export function getCreditCardInvoiceSummary(invoices: CreditCardInvoice[], month: string) {
  const monthInvoices = getCreditCardInvoicesForMonth(invoices, month);
  const predicted = monthInvoices.filter((invoice) => ['aberta', 'previsto'].includes(String(invoice.status)));
  const paid = monthInvoices.filter((invoice) => invoice.status === 'pago');
  return {
    invoices: monthInvoices,
    predicted,
    paid,
    total: monthInvoices.reduce((sum, invoice) => sum + getCreditCardInvoiceTotal(invoice), 0),
    previsto: predicted.reduce((sum, invoice) => sum + getCreditCardInvoiceTotal(invoice), 0),
    pago: paid.reduce((sum, invoice) => sum + getCreditCardInvoiceTotal(invoice), 0)
  };
}

export function getInvoiceTransactionId(invoice: CreditCardInvoice): string {
  return String(invoice.transaction_id || `fatura-${invoice.id}`);
}

export function createInvoiceExpenseTransaction(invoice: CreditCardInvoice): Transaction {
  const transactionId = getInvoiceTransactionId(invoice);
  return {
    id: transactionId,
    categoria: 'Cartão de crédito',
    conta_id: invoice.conta_id,
    data: invoice.mes_pagamento ? `${invoice.mes_pagamento}-01` : '',
    data_movimento: invoice.mes_pagamento ? `${invoice.mes_pagamento}-01` : '',
    descricao: invoice.descricao || 'Fatura de cartão',
    desc: invoice.descricao || 'Fatura de cartão',
    fatura_cartao_id: invoice.id,
    status: invoice.status === 'pago' ? 'confirmado' : 'previsto',
    tipo: 'despesa',
    valor: getCreditCardInvoiceTotal(invoice)
  };
}

export function upsertInvoiceExpenseTransaction(transactions: Transaction[], invoice: CreditCardInvoice): Transaction[] {
  if (invoice.status === 'aberta' || invoice.status === 'cancelado') {
    return transactions.filter((tx) => String(tx.fatura_cartao_id || '') !== String(invoice.id));
  }

  const invoiceTransaction = createInvoiceExpenseTransaction(invoice);
  const found = transactions.some((tx) => String(tx.fatura_cartao_id || '') === String(invoice.id));
  if (!found) return [...transactions, invoiceTransaction];

  return transactions.map((tx) => (
    String(tx.fatura_cartao_id || '') === String(invoice.id)
      ? { ...tx, ...invoiceTransaction, id: tx.id || invoiceTransaction.id }
      : tx
  ));
}

export function updateInvoiceStatusWithTransaction(
  invoices: CreditCardInvoice[],
  transactions: Transaction[],
  invoiceId: string | number,
  status: 'aberta' | 'previsto' | 'pago' | 'cancelado'
) {
  const updatedInvoices = invoices.map((invoice) => (
    String(invoice.id) === String(invoiceId)
      ? {
          ...invoice,
          status,
          data_pagamento: status === 'pago' ? new Date().toISOString().slice(0, 10) : null,
          transaction_id: status === 'aberta' || status === 'cancelado' ? null : getInvoiceTransactionId(invoice)
        }
      : invoice
  ));
  const updatedInvoice = updatedInvoices.find((invoice) => String(invoice.id) === String(invoiceId));
  return {
    invoices: updatedInvoices,
    transactions: updatedInvoice ? upsertInvoiceExpenseTransaction(transactions, updatedInvoice) : transactions
  };
}
