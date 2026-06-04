import { describe, expect, it } from 'vitest';
import {
  calculateAccountBalance,
  compareTransactionsDesc,
  filterTransactions,
  getCashFlowProjection,
  createInvoiceExpenseTransaction,
  getBudgetSummary,
  getCreditCardInvoicePurchases,
  getCreditCardInvoiceSummary,
  getCreditCardInvoiceTotal,
  getMesSummary,
  getMonthlyReportSeries,
  getSaldoTotal,
  getStrategicMetrics,
  transactionSignedAmount,
  updateInvoiceStatusWithTransaction
} from './index';
import type { Account, CreditCardInvoice, FinanceState, Transaction } from './types';

const accounts: Account[] = [
  { id: 'bb', nome: 'Banco do Brasil', saldo_inicial: 1000, ativo: true },
  { id: 'caixa', nome: 'Caixa', saldo_inicial: -200, ativo: true },
  { id: 'old', nome: 'Inativa', saldo_inicial: 999, ativo: false }
];

const transactions: Transaction[] = [
  { id: '1', conta_id: 'bb', tipo: 'receita', valor: 500, status: 'confirmado', data: '2026-06-02', created_at: '2026-06-02T09:00:00Z' },
  { id: '2', conta_id: 'bb', tipo: 'despesa', valor: 120, status: 'confirmado', categoria: 'Mercado', data: '2026-06-02', created_at: '2026-06-02T10:00:00Z' },
  { id: '3', conta_id: 'bb', tipo: 'despesa', valor: 80, status: 'previsto', categoria: 'Mercado', data: '2026-06-02', created_at: '2026-06-02T11:00:00Z' },
  { id: '4', conta_id: 'caixa', tipo: 'transferencia_entrada', valor: 50, status: 'confirmado', data: '2026-06-03', created_at: '2026-06-03T08:00:00Z' },
  { id: '5', conta_id: 'bb', tipo: 'transferencia_saida', valor: 50, status: 'confirmado', data: '2026-06-03', created_at: '2026-06-03T08:00:01Z' }
];

describe('regras de transações e contas', () => {
  it('calcula sinal apenas para lançamentos confirmados', () => {
    expect(transactionSignedAmount(transactions[0])).toBe(500);
    expect(transactionSignedAmount(transactions[1])).toBe(-120);
    expect(transactionSignedAmount(transactions[2])).toBe(0);
    expect(transactionSignedAmount(transactions[3])).toBe(50);
    expect(transactionSignedAmount(transactions[4])).toBe(-50);
  });

  it('mantém lançamento pendente fora dos cálculos confirmados', () => {
    const confirmedEntry: Transaction = { tipo: 'receita', valor: 300, status: 'confirmado' };
    const pendingEntry: Transaction = { tipo: 'receita', valor: 300, status: 'previsto' };

    expect(transactionSignedAmount(confirmedEntry)).toBe(300);
    expect(transactionSignedAmount(pendingEntry)).toBe(0);
  });

  it('calcula saldo por conta considerando transferências e ignorando pendentes', () => {
    expect(calculateAccountBalance(accounts[0], transactions)).toBe(1330);
    expect(calculateAccountBalance(accounts[1], transactions)).toBe(-150);
  });

  it('calcula saldo total com contas negativas e ignora contas inativas', () => {
    expect(getSaldoTotal(accounts, transactions)).toBe(1180);
  });

  it('ordena transações mais recentes primeiro, com desempate por criação e id', () => {
    const sorted = transactions.slice().sort(compareTransactionsDesc);
    expect(sorted.map((tx) => tx.id)).toEqual(['5', '4', '3', '2', '1']);
  });

  it('filtra transações por tipo, mês, categoria e busca', () => {
    expect(filterTransactions(transactions, { kind: 'receitas' }).map((tx) => tx.id)).toEqual(['1']);
    expect(filterTransactions(transactions, { kind: 'despesas', category: 'Mercado' }).map((tx) => tx.id)).toEqual(['2', '3']);
    expect(filterTransactions(transactions, { kind: 'transferencias' }).map((tx) => tx.id)).toEqual(['4', '5']);
    expect(filterTransactions(transactions, { month: '2026-06', search: 'mercado' }).map((tx) => tx.id)).toEqual(['2', '3']);
  });
});

describe('regras de faturas de cartão', () => {
  const invoices: CreditCardInvoice[] = [
    {
      id: 'open',
      status: 'aberta',
      valor: 100,
      descricao: 'Fatura Sicoob',
      categoria: 'Cartão de crédito',
      mes_competencia: '2026-05',
      mes_pagamento: '2026-06',
      compras: []
    },
    {
      id: 'planned',
      status: 'previsto',
      mes_pagamento: '2026-06',
      compras: [
        { id: 'a', valor: 30, categoria: 'Mercado' },
        { id: 'b', valor: 70, categoria: 'Farmácia' }
      ]
    },
    { id: 'paid', status: 'pago', mes_pagamento: '2026-06', valor: 40 },
    { id: 'cancelled', status: 'cancelado', mes_pagamento: '2026-06', valor: 999 }
  ];

  it('usa compras quando existem e valor avulso quando compras estão vazias', () => {
    expect(getCreditCardInvoiceTotal(invoices[0])).toBe(100);
    expect(getCreditCardInvoiceTotal(invoices[1])).toBe(100);
  });

  it('representa fatura avulsa como compra visível', () => {
    expect(getCreditCardInvoicePurchases(invoices[0])).toEqual([
      expect.objectContaining({ id: '__manual_invoice_value__', descricao: 'Fatura Sicoob', valor: 100, manual: true })
    ]);
  });

  it('permite reembolso negativo abatendo o total da fatura', () => {
    const invoice: CreditCardInvoice = {
      id: 'refund-invoice',
      status: 'pago',
      conta_id: 'bb',
      mes_pagamento: '2026-06',
      compras: [
        { id: 'purchase', valor: 150, categoria: 'Mercado' },
        { id: 'refund', valor: -40, categoria: 'Reembolso' }
      ]
    };
    expect(getCreditCardInvoiceTotal(invoice)).toBe(110);
    expect(getCreditCardInvoicePurchases(invoice).map((purchase) => purchase.valor)).toEqual([150, -40]);

    const negativeInvoice: CreditCardInvoice = { id: 'negative-invoice', status: 'pago', conta_id: 'bb', mes_pagamento: '2026-06', valor: -25 };
    expect(getCreditCardInvoicePurchases(negativeInvoice)).toEqual([
      expect.objectContaining({ id: '__manual_invoice_value__', valor: -25, manual: true })
    ]);
    expect(transactionSignedAmount(createInvoiceExpenseTransaction(negativeInvoice))).toBe(25);
  });

  it('resume abertas, previstas e pagas sem incluir canceladas', () => {
    const summary = getCreditCardInvoiceSummary(invoices, '2026-06');
    expect(summary.total).toBe(240);
    expect(summary.previsto).toBe(200);
    expect(summary.pago).toBe(40);
    expect(summary.invoices.map((invoice) => invoice.id)).not.toContain('cancelled');
  });

  it('fecha fatura como despesa pendente sem duplicar transação', () => {
    const invoice: CreditCardInvoice = { ...invoices[1], id: 'invoice-close', conta_id: 'bb', status: 'previsto' };
    const tx = createInvoiceExpenseTransaction(invoice);
    expect(tx.tipo).toBe('despesa');
    expect(tx.status).toBe('previsto');
    expect(tx.fatura_cartao_id).toBe('invoice-close');
    expect(tx.valor).toBe(100);

    const first = updateInvoiceStatusWithTransaction([invoice], [], 'invoice-close', 'previsto');
    const second = updateInvoiceStatusWithTransaction(first.invoices, first.transactions, 'invoice-close', 'previsto');
    expect(first.transactions).toHaveLength(1);
    expect(second.transactions).toHaveLength(1);
  });

  it('paga, reabre e cancela fatura atualizando a transação vinculada', () => {
    const invoice: CreditCardInvoice = { ...invoices[0], id: 'invoice-status', conta_id: 'bb', status: 'previsto' };
    const paid = updateInvoiceStatusWithTransaction([invoice], [], 'invoice-status', 'pago');
    expect(paid.transactions[0].status).toBe('confirmado');

    const reopened = updateInvoiceStatusWithTransaction(paid.invoices, paid.transactions, 'invoice-status', 'aberta');
    expect(reopened.invoices[0].status).toBe('aberta');
    expect(reopened.transactions).toHaveLength(0);

    const cancelled = updateInvoiceStatusWithTransaction(paid.invoices, paid.transactions, 'invoice-status', 'cancelado');
    expect(cancelled.invoices[0].status).toBe('cancelado');
    expect(cancelled.transactions).toHaveLength(0);
  });
});

describe('resumos, orçamento e indicadores', () => {
  const invoices: CreditCardInvoice[] = [
    { id: 'invoice', status: 'previsto', mes_pagamento: '2026-06', valor: 90 }
  ];

  const state: FinanceState = {
    contas: accounts,
    transacoes: transactions,
    faturas_cartao: invoices,
    recorrentes: [{ id: 'rent', tipo: 'despesa', categoria: 'Aluguel', desc: 'Aluguel' }],
    orcamento: { Mercado: 200, Lazer: 50 }
  };

  it('resume receitas e despesas confirmadas do mês sem somar pendentes', () => {
    const summary = getMesSummary(state, '2026-06');
    expect(summary.rec).toBe(500);
    expect(summary.dep).toBe(120);
    expect(summary.depPrevista).toBe(90);
    expect(summary.depTotal).toBe(120);
    expect(summary.saldo).toBe(380);
  });

  it('calcula totais de orçamento por categoria com despesas confirmadas', () => {
    const budget = getBudgetSummary(state.orcamento || {}, state.transacoes, '2026-06');
    expect(budget.totalLimit).toBe(250);
    expect(budget.totalSpent).toBe(120);
    expect(budget.available).toBe(130);
    expect(budget.items.find((item) => item.category === 'Mercado')?.spent).toBe(120);
  });

  it('ignora limites zerados e evidencia orçamento estourado', () => {
    const budget = getBudgetSummary({ Mercado: 100, Lazer: 0 }, state.transacoes, '2026-06');
    expect(budget.items.map((item) => item.category)).toEqual(['Mercado']);
    expect(budget.totalSpent).toBe(120);
    expect(budget.available).toBe(-20);
    expect(budget.pct).toBe(100);
  });

  it('mantém patrimônio líquido considerando saldo negativo', () => {
    const metrics = getStrategicMetrics(state, '2026-06');
    expect(metrics.netWorth).toBe(1180);
    expect(metrics.netWorth).toBe(getSaldoTotal(state.contas, state.transacoes));
  });

  it('gera série mensal separando realizado e faturas previstas', () => {
    const series = getMonthlyReportSeries(state, '2026-06', 2);
    expect(series[0]).toEqual(expect.objectContaining({
      month: '2026-06',
      receitas: 500,
      despesas: 120,
      faturasPrevistas: 90,
      saldo: 380
    }));
    expect(series[1].month).toBe('2026-07');
  });

  it('projeta fluxo de caixa mantendo faturas previstas separadas do realizado', () => {
    const projection = getCashFlowProjection(state, '2026-06', 1);
    expect(projection[0].receitasConfirmadas).toBe(500);
    expect(projection[0].despesasConfirmadas).toBe(120);
    expect(projection[0].faturasPrevistas).toBe(90);
    expect(projection[0].saldoProjetado).toBe(1090);
  });
});
