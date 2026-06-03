import type { CreditCardInvoice, CreditCardPurchase } from './types';

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
  return invoice && getCreditCardInvoiceTotal(invoice) > 0 ? [createManualInvoicePurchase(invoice)] : [];
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
