import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Select } from '../components';
import {
  getCreditCardInvoicePurchases,
  getCreditCardInvoiceTotal,
  updateInvoiceStatusWithTransaction
} from '../../domain/creditCards';
import type { Account, CreditCardInvoice, CreditCardPurchase, Transaction } from '../../domain/types';
import { createId, type CategoryState, type CreditCardState } from '../state/financeState';

interface CreditCardsPageProps {
  accounts: Account[];
  cards: CreditCardState[];
  categories: CategoryState;
  invoices: CreditCardInvoice[];
  onChange: (payload: { invoices: CreditCardInvoice[]; transactions: Transaction[] }) => void;
  transactions: Transaction[];
}

interface PurchaseDraft {
  categoria: string;
  data: string;
  descricao: string;
  mes: string;
  valor: string;
}

const emptyPurchase: PurchaseDraft = {
  categoria: '',
  data: '',
  descricao: '',
  mes: new Date().toISOString().slice(0, 7),
  valor: ''
};

function parseMoney(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function isReimbursement(value?: number | string) {
  return (Number(value) || 0) < 0;
}

function paymentMonth(month: string) {
  if (!month) return '';
  const date = new Date(`${month}-02T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 7);
}

function monthLabel(month?: string) {
  if (!month) return 'Sem mês';
  const [year, monthNumber] = month.split('-');
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function invoiceForCard(invoices: CreditCardInvoice[], cardId: string, month: string) {
  return invoices.find((invoice) => String(invoice.cartao_id) === cardId && invoice.mes_competencia === month);
}

function accountName(accounts: Account[], id?: string | number) {
  return accounts.find((account) => String(account.id) === String(id))?.nome || 'Conta não definida';
}

function statusLabel(status?: string) {
  if (status === 'pago') return 'Pago';
  if (status === 'cancelado') return 'Cancelado';
  if (status === 'previsto') return 'Fechada';
  return 'Aberta';
}

export function CreditCardsPage({ accounts, cards, categories, invoices, onChange, transactions }: CreditCardsPageProps) {
  const [selectedCardId, setSelectedCardId] = useState('');
  const [draft, setDraft] = useState<PurchaseDraft>(emptyPurchase);
  const [error, setError] = useState('');
  const selectedCard = cards.find((card) => card.id === selectedCardId);
  const selectedInvoice = selectedCard ? invoiceForCard(invoices, selectedCard.id, draft.mes) : undefined;
  const closedInvoices = useMemo(
    () => invoices.filter((invoice) => invoice.status !== 'aberta').sort((a, b) => String(b.mes_pagamento || '').localeCompare(String(a.mes_pagamento || ''))),
    [invoices]
  );

  function patchInvoice(nextInvoice: CreditCardInvoice) {
    const exists = invoices.some((invoice) => String(invoice.id) === String(nextInvoice.id));
    return exists
      ? invoices.map((invoice) => (String(invoice.id) === String(nextInvoice.id) ? nextInvoice : invoice))
      : [...invoices, nextInvoice];
  }

  function registerPurchase() {
    if (!selectedCard) return;
    const value = parseMoney(draft.valor);
    if (!draft.mes || !draft.data || !draft.categoria || !draft.descricao.trim() || !value) {
      setError('Preencha mês, data, categoria, descrição e um valor diferente de zero.');
      return;
    }

    const currentInvoice = selectedInvoice || {
      id: createId('fatura'),
      cartao_id: selectedCard.id,
      conta_id: selectedCard.conta_id,
      mes_competencia: draft.mes,
      mes_pagamento: paymentMonth(draft.mes),
      status: 'aberta',
      compras: []
    };

    if (currentInvoice.status !== 'aberta') {
      setError('Reabra a fatura antes de lançar novas compras.');
      return;
    }

    const purchase: CreditCardPurchase = {
      id: createId('compra'),
      categoria: draft.categoria,
      data: draft.data,
      data_compra: draft.data,
      descricao: draft.descricao.trim(),
      valor: value
    };
    const nextInvoice = {
      ...currentInvoice,
      compras: [...(currentInvoice.compras || []), purchase],
      valor: undefined
    };

    onChange({ invoices: patchInvoice(nextInvoice), transactions });
    setDraft({ ...emptyPurchase, mes: draft.mes });
    setError('');
  }

  function setInvoiceStatus(invoice: CreditCardInvoice, status: 'aberta' | 'previsto' | 'pago' | 'cancelado') {
    const result = updateInvoiceStatusWithTransaction(invoices, transactions, invoice.id || '', status);
    onChange(result);
  }

  function removeCardInvoice(invoice: CreditCardInvoice) {
    const result = updateInvoiceStatusWithTransaction(invoices, transactions, invoice.id || '', 'cancelado');
    onChange(result);
  }

  return (
    <div className="modern-preview-stack">
      <Card title="Cartões de Crédito" subtitle="Selecione um cartão para gerenciar a fatura logo abaixo dele.">
        <div className="modern-credit-card-grid">
          {cards.map((card) => {
            const cardInvoice = invoiceForCard(invoices, card.id, draft.mes);
            const total = getCreditCardInvoiceTotal(cardInvoice);
            const isSelected = selectedCardId === card.id;

            return (
              <div className="modern-credit-card-slot" key={card.id}>
                <button
                  className={['modern-credit-card', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}
                  onClick={() => setSelectedCardId((current) => current === card.id ? '' : card.id)}
                  style={{ ['--card-color' as string]: card.cor }}
                  type="button"
                >
                  <div>
                    <div className="modern-credit-card-name">{card.nome}</div>
                    <div className="modern-row-subtitle">{card.banco} · final {card.final}</div>
                  </div>
                  <div className="modern-credit-card-total">{formatCurrency(total)}</div>
                  <div className="modern-credit-card-tags">
                    <span>Limite {formatCurrency(card.limite)}</span>
                    <span>Fecha dia {card.fecha_dia}</span>
                    <span>Vence dia {card.vence_dia}</span>
                  </div>
                </button>

                {isSelected && selectedCard && (
                  <div className="modern-invoice-panel">
                    <div className="modern-invoice-header">
                      <div>
                        <h3>Gerenciamento da fatura</h3>
                        <span>{selectedCard.nome} · {monthLabel(draft.mes)}</span>
                      </div>
                      <div className="modern-row-actions">
                        {selectedInvoice && <Badge tone={selectedInvoice.status === 'cancelado' ? 'danger' : selectedInvoice.status === 'pago' ? 'success' : 'warning'}>{statusLabel(selectedInvoice.status)}</Badge>}
                        {selectedInvoice?.status === 'aberta' && <Button onClick={() => setInvoiceStatus(selectedInvoice, 'previsto')}>Fechar</Button>}
                        {selectedInvoice?.status === 'previsto' && <Button onClick={() => setInvoiceStatus(selectedInvoice, 'pago')} variant="primary">Marcar pago</Button>}
                        {selectedInvoice && selectedInvoice.status !== 'aberta' && <Button onClick={() => setInvoiceStatus(selectedInvoice, 'aberta')} variant="ghost">Reabrir fatura</Button>}
                        {selectedInvoice?.status === 'cancelado' && <Button onClick={() => setInvoiceStatus(selectedInvoice, 'previsto')} variant="ghost">Reativar</Button>}
                        {selectedInvoice && selectedInvoice.status !== 'cancelado' && <Button onClick={() => removeCardInvoice(selectedInvoice)} variant="danger">Cancelar</Button>}
                      </div>
                    </div>

                    <div className="modern-form-grid">
                      <Input label="Mês da fatura" onChange={(event) => setDraft({ ...draft, mes: event.target.value })} type="month" value={draft.mes} />
                      <Input label="Data da compra" onChange={(event) => setDraft({ ...draft, data: event.target.value })} type="date" value={draft.data} />
                      <Input label="Valor da compra ou reembolso" onChange={(event) => setDraft({ ...draft, valor: event.target.value })} placeholder="0,00 ou -100,00" value={draft.valor} />
                      <Select label="Categoria" onChange={(event) => setDraft({ ...draft, categoria: event.target.value })} value={draft.categoria}>
                        <option value="">Selecione uma categoria</option>
                        {categories.despesa.map((category) => <option key={category} value={category}>{category}</option>)}
                      </Select>
                    </div>
                    <Input label="Descrição da compra" onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} placeholder="Ex: mercado, farmácia, assinatura" value={draft.descricao} />
                    {error && <div className="modern-form-error">{error}</div>}
                    <Button onClick={registerPurchase} variant="primary">Registrar compra</Button>

                    <div className="modern-invoice-summary">
                      <div><strong>Compras</strong><span>{getCreditCardInvoicePurchases(selectedInvoice).length}</span></div>
                      <div><strong>Total acumulado</strong><span>{formatCurrency(getCreditCardInvoiceTotal(selectedInvoice))}</span></div>
                      <div><strong>Pagamento</strong><span>{monthLabel(selectedInvoice?.mes_pagamento || paymentMonth(draft.mes))}</span></div>
                      <div><strong>Conta</strong><span>{accountName(accounts, selectedInvoice?.conta_id || selectedCard.conta_id)}</span></div>
                    </div>

                    <div className="modern-list">
                      {getCreditCardInvoicePurchases(selectedInvoice).map((purchase) => (
                        <div className="modern-list-row" key={String(purchase.id)}>
                          <div>
                            <div className="modern-row-title">{purchase.descricao || purchase.desc || 'Compra'}</div>
                            <div className="modern-row-subtitle">{purchase.categoria || 'Sem categoria'} · {purchase.data || purchase.data_compra || 'Sem data'}</div>
                          </div>
                          <Badge tone={isReimbursement(purchase.valor) ? 'income' : 'expense'}>
                            {isReimbursement(purchase.valor) ? 'Reembolso ' : ''}
                            {formatCurrency(purchase.valor)}
                          </Badge>
                        </div>
                      ))}
                      {!getCreditCardInvoicePurchases(selectedInvoice).length && (
                        <EmptyState title="Nenhuma compra registrada nesta fatura aberta." text="Compras aparecerão aqui assim que forem lançadas." />
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Faturas fechadas" subtitle="Histórico e status de pagamento">
        <div className="modern-list">
          {closedInvoices.map((invoice) => (
            <div className="modern-list-row modern-invoice-history-row" key={String(invoice.id)}>
              <div>
                <div className="modern-row-title">{invoice.descricao || `Fatura ${cards.find((card) => card.id === invoice.cartao_id)?.nome || ''}`}</div>
                <div className="modern-row-subtitle">
                  {monthLabel(invoice.mes_competencia)} · pagamento {monthLabel(invoice.mes_pagamento)} · {getCreditCardInvoicePurchases(invoice).length || 'Fatura avulsa'} compra(s)
                </div>
              </div>
              <div className="modern-row-actions">
                <Badge tone={invoice.status === 'cancelado' ? 'danger' : invoice.status === 'pago' ? 'success' : 'warning'}>{statusLabel(invoice.status)}</Badge>
                <strong className="modern-value-expense">{formatCurrency(getCreditCardInvoiceTotal(invoice))}</strong>
                {invoice.status === 'previsto' && <Button onClick={() => setInvoiceStatus(invoice, 'pago')} variant="primary">Marcar pago</Button>}
                {invoice.status === 'cancelado' && <Button onClick={() => setInvoiceStatus(invoice, 'previsto')} variant="ghost">Reativar</Button>}
                {invoice.status !== 'aberta' && <Button onClick={() => setInvoiceStatus(invoice, 'aberta')} variant="ghost">Reabrir fatura</Button>}
              </div>
            </div>
          ))}
          {!closedInvoices.length && <EmptyState title="Nenhuma fatura fechada" text="Feche uma fatura para acompanhar o histórico." />}
        </div>
      </Card>
    </div>
  );
}
