import { useMemo, useState } from 'react';
import { Badge, Button, Card, Dialog, EmptyState, Input, SegmentedControl, Select } from '../components';
import {
  compareTransactionsDesc,
  filterTransactions,
  getTransactionDate,
  getTransactionDescription,
  isTransferTransaction,
  type TransactionFilterKind
} from '../../domain/transactions';
import type { Account, Transaction } from '../../domain/types';
import type { CategoryState } from '../state/financeState';

interface TransactionsPageProps {
  accounts: Account[];
  categories: CategoryState;
  onChange: (transactions: Transaction[]) => void;
  transactions: Transaction[];
}

interface TransactionRow {
  id: string;
  isTransfer: boolean;
  primary: Transaction;
  transactions: Transaction[];
}

interface EditDraft {
  categoria: string;
  contaId: string;
  data: string;
  descricao: string;
  status: 'confirmado' | 'previsto';
  tags: string;
  tipo: 'receita' | 'despesa';
  valor: string;
}

const emptyEditDraft: EditDraft = {
  categoria: '',
  contaId: '',
  data: '',
  descricao: '',
  status: 'confirmado',
  tags: '',
  tipo: 'despesa',
  valor: ''
};

function parseMoney(value: string): number {
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDate(value: string) {
  if (!value) return 'Sem data';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : value;
}

function accountName(accounts: Account[], id?: string | number) {
  return accounts.find((account) => String(account.id) === String(id))?.nome || 'Sem conta';
}

function transactionTone(tx: Transaction) {
  if (isTransferTransaction(tx)) return 'warning';
  return tx.tipo === 'receita' ? 'income' : 'expense';
}

function transactionTypeLabel(tx: Transaction) {
  if (isTransferTransaction(tx)) return 'Transferência';
  return tx.tipo === 'receita' ? 'Receita' : 'Despesa';
}

function groupTransactionsForDisplay(transactions: Transaction[]): TransactionRow[] {
  const sorted = transactions.slice().sort(compareTransactionsDesc);
  const seen = new Set<string>();
  const rows: TransactionRow[] = [];

  sorted.forEach((tx) => {
    const transferId = tx.transfer_id ? String(tx.transfer_id) : '';
    if (transferId && isTransferTransaction(tx)) {
      if (seen.has(transferId)) return;
      const group = sorted.filter((item) => String(item.transfer_id || '') === transferId);
      group.forEach((item) => seen.add(String(item.transfer_id)));
      rows.push({ id: `transfer-${transferId}`, isTransfer: true, primary: group[0], transactions: group });
      return;
    }

    rows.push({ id: String(tx.id), isTransfer: false, primary: tx, transactions: [tx] });
  });

  return rows;
}

function rowTitle(row: TransactionRow, accounts: Account[]) {
  if (!row.isTransfer) {
    return getTransactionDescription(row.primary) || row.primary.categoria || 'Lançamento';
  }

  const out = row.transactions.find((tx) => tx.tipo === 'transferencia_saida');
  const input = row.transactions.find((tx) => tx.tipo === 'transferencia_entrada');
  return `Transferência: ${accountName(accounts, out?.conta_id)} → ${accountName(accounts, input?.conta_id)}`;
}

function rowSubtitle(row: TransactionRow, accounts: Account[]) {
  if (row.isTransfer) {
    return `${formatDate(getTransactionDate(row.primary))} · ${row.transactions.length} lançamentos vinculados`;
  }

  return `${formatDate(getTransactionDate(row.primary))} · ${accountName(accounts, row.primary.conta_id)} · ${row.primary.categoria || 'Sem categoria'}`;
}

function rowAmount(row: TransactionRow) {
  if (!row.isTransfer) return row.primary.valor;
  return row.transactions.find((tx) => tx.tipo === 'transferencia_saida')?.valor || row.primary.valor;
}

function rowValueClass(row: TransactionRow) {
  if (row.isTransfer) return 'modern-value-transfer';
  return row.primary.tipo === 'receita' ? 'modern-value-income' : 'modern-value-expense';
}

function categoryOptions(categories: CategoryState, transactions: Transaction[]) {
  return Array.from(new Set([
    ...categories.despesa,
    ...categories.receita,
    ...transactions.map((tx) => tx.categoria || '').filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));
}

export function TransactionsPage({ accounts, categories, onChange, transactions }: TransactionsPageProps) {
  const [kind, setKind] = useState<TransactionFilterKind>('todas');
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [editingRow, setEditingRow] = useState<TransactionRow | null>(null);
  const [draft, setDraft] = useState<EditDraft>(emptyEditDraft);

  const options = useMemo(() => categoryOptions(categories, transactions), [categories, transactions]);
  const filteredRows = useMemo(() => {
    const filtered = filterTransactions(transactions, { category, kind, month, search });
    return groupTransactionsForDisplay(filtered);
  }, [category, kind, month, search, transactions]);

  function setStatus(row: TransactionRow, status: 'confirmado' | 'previsto') {
    const ids = new Set(row.transactions.map((tx) => String(tx.id)));
    const now = new Date().toISOString();
    onChange(transactions.map((tx) => (
      ids.has(String(tx.id)) ? { ...tx, status, updated_at: now } : tx
    )));
  }

  function remove(row: TransactionRow) {
    const ids = new Set(row.transactions.map((tx) => String(tx.id)));
    onChange(transactions.filter((tx) => !ids.has(String(tx.id))));
  }

  function openEdit(row: TransactionRow) {
    const tx = row.primary;
    setEditingRow(row);
    setDraft({
      categoria: row.isTransfer ? 'Transferência' : tx.categoria || '',
      contaId: String(tx.conta_id || ''),
      data: getTransactionDate(tx),
      descricao: getTransactionDescription(tx),
      status: tx.status === 'confirmado' ? 'confirmado' : 'previsto',
      tags: tx.tags || '',
      tipo: tx.tipo === 'receita' ? 'receita' : 'despesa',
      valor: String(tx.valor || '').replace('.', ',')
    });
  }

  function saveEdit() {
    if (!editingRow) return;
    const value = parseMoney(draft.valor);
    if (!value || !draft.data) return;

    const ids = new Set(editingRow.transactions.map((tx) => String(tx.id)));
    const now = new Date().toISOString();
    onChange(transactions.map((tx) => {
      if (!ids.has(String(tx.id))) return tx;

      return {
        ...tx,
        categoria: editingRow.isTransfer ? 'Transferência' : draft.categoria,
        conta_id: editingRow.isTransfer ? tx.conta_id : draft.contaId,
        data: draft.data,
        data_movimento: draft.data,
        desc: draft.descricao.trim(),
        descricao: draft.descricao.trim(),
        status: draft.status,
        tags: draft.tags.trim(),
        tipo: editingRow.isTransfer ? tx.tipo : draft.tipo,
        updated_at: now,
        valor: value
      };
    }));
    setEditingRow(null);
    setDraft(emptyEditDraft);
  }

  return (
    <>
      <Card title="Transações" subtitle={`${filteredRows.length} registro(s) exibido(s)`}>
        <div className="modern-transactions-toolbar">
          <SegmentedControl
            onChange={(value) => setKind(value as TransactionFilterKind)}
            options={[
              { label: 'Todas', value: 'todas' },
              { label: 'Receitas', value: 'receitas' },
              { label: 'Despesas', value: 'despesas' },
              { label: 'Transferências', value: 'transferencias' }
            ]}
            value={kind}
          />

          <div className="modern-transactions-filters">
            <Input label="Mês" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
            <Select label="Categoria" onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="">Todas as categorias</option>
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </Select>
            <Input label="Busca" onChange={(event) => setSearch(event.target.value)} placeholder="Descrição, tag, status..." value={search} />
          </div>
        </div>

        <div className="modern-list modern-transactions-list">
          {filteredRows.map((row) => (
            <div className="modern-list-row modern-transaction-row" key={row.id}>
              <div>
                <div className="modern-row-title">{rowTitle(row, accounts)}</div>
                <div className="modern-row-subtitle">{rowSubtitle(row, accounts)}</div>
              </div>
              <div className="modern-row-actions">
                <Badge tone={transactionTone(row.primary)}>{transactionTypeLabel(row.primary)}</Badge>
                <Badge tone={row.primary.status === 'confirmado' ? 'success' : 'warning'}>
                  {row.primary.status === 'confirmado' ? '👍 Confirmado' : '👎 Pendente'}
                </Badge>
                <strong className={rowValueClass(row)}>
                  {formatCurrency(rowAmount(row))}
                </strong>
                <Button
                  onClick={() => setStatus(row, row.primary.status === 'confirmado' ? 'previsto' : 'confirmado')}
                  variant="ghost"
                >
                  {row.primary.status === 'confirmado' ? '👎' : '👍'}
                </Button>
                <Button onClick={() => openEdit(row)} variant="ghost">Editar</Button>
                <Button onClick={() => remove(row)} variant="danger">Remover</Button>
              </div>
            </div>
          ))}
          {!filteredRows.length && (
            <EmptyState
              title="Nenhuma transação encontrada"
              text="Ajuste os filtros ou registre um novo lançamento."
            />
          )}
        </div>
      </Card>

      <Dialog
        confirmLabel="Salvar"
        onCancel={() => setEditingRow(null)}
        onConfirm={saveEdit}
        open={Boolean(editingRow)}
        title={editingRow?.isTransfer ? 'Editar Transferência' : 'Editar Transação'}
      >
        <div className="modern-preview-stack">
          {editingRow?.isTransfer ? (
            <div className="modern-form-note">Transferências vinculadas são editadas em conjunto para manter entrada e saída agrupadas.</div>
          ) : (
            <div className="modern-form-grid">
              <Select label="Tipo" onChange={(event) => setDraft({ ...draft, tipo: event.target.value as EditDraft['tipo'], categoria: '' })} value={draft.tipo}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </Select>
              <Select label="Conta" onChange={(event) => setDraft({ ...draft, contaId: event.target.value })} value={draft.contaId}>
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => <option key={String(account.id)} value={String(account.id)}>{account.nome}</option>)}
              </Select>
            </div>
          )}

          <div className="modern-form-grid">
            <Input label="Valor" onChange={(event) => setDraft({ ...draft, valor: event.target.value })} value={draft.valor} />
            <Input label="Data" onChange={(event) => setDraft({ ...draft, data: event.target.value })} type="date" value={draft.data} />
            {!editingRow?.isTransfer && (
              <Select label="Categoria" onChange={(event) => setDraft({ ...draft, categoria: event.target.value })} value={draft.categoria}>
                <option value="">Selecione uma categoria</option>
                {(categories[draft.tipo] || []).map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            )}
            <Select label="Status" onChange={(event) => setDraft({ ...draft, status: event.target.value as EditDraft['status'] })} value={draft.status}>
              <option value="confirmado">👍 Confirmado</option>
              <option value="previsto">👎 Pendente</option>
            </Select>
          </div>

          <Input label="Descrição" onChange={(event) => setDraft({ ...draft, descricao: event.target.value })} value={draft.descricao} />
          <Input label="Tags" onChange={(event) => setDraft({ ...draft, tags: event.target.value })} value={draft.tags} />
        </div>
      </Dialog>
    </>
  );
}
