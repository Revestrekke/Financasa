export type TransactionType = 'receita' | 'despesa' | 'transferencia_entrada' | 'transferencia_saida' | string;
export type TransactionStatus = 'confirmado' | 'previsto' | string;
export type InvoiceStatus = 'aberta' | 'previsto' | 'pago' | 'cancelado' | string;

export interface Transaction {
  id?: string | number;
  conta_id?: string | number;
  conta?: string;
  tipo?: TransactionType;
  valor?: number | string;
  categoria?: string;
  categoria_id?: string;
  descricao?: string;
  desc?: string;
  tags?: string;
  status?: TransactionStatus;
  data_movimento?: string;
  data?: string;
  created_at?: string;
  updated_at?: string;
  fatura_cartao_id?: string | number | null;
  transfer_id?: string | number | null;
}

export interface Account {
  id?: string | number;
  nome?: string;
  tipo?: string;
  ativo?: boolean;
  saldo_inicial?: number | string;
}

export interface CreditCardPurchase {
  id?: string | number;
  descricao?: string;
  desc?: string;
  valor?: number | string;
  categoria?: string;
  categoria_id?: string;
  data?: string;
  data_compra?: string;
}

export interface CreditCardInvoice {
  id?: string | number;
  cartao_id?: string | number;
  valor?: number | string;
  mes_competencia?: string;
  mes_pagamento?: string;
  descricao?: string;
  categoria?: string;
  categoria_id?: string;
  status?: InvoiceStatus;
  conta_id?: string | number;
  transaction_id?: string | number | null;
  data_pagamento?: string | null;
  compras?: CreditCardPurchase[];
}

export interface RecurringTransaction {
  id?: string | number;
  desc?: string;
  categoria?: string;
  tipo?: TransactionType;
}

export interface FinanceState {
  transacoes: Transaction[];
  contas: Account[];
  faturas_cartao: CreditCardInvoice[];
  recorrentes?: RecurringTransaction[];
  orcamento?: Record<string, number | string>;
}
