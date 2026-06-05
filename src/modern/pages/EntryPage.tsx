import { useMemo, useState } from 'react';
import { Badge, Button, Card, Dialog, EmptyState, Input, SegmentedControl, Select } from '../components';
import { compareTransactionsDesc, getTransactionDate, getTransactionDescription } from '../../domain/transactions';
import type { Account, Transaction } from '../../domain/types';
import { createId, type CategoryState } from '../state/financeState';

type EntryType = 'despesa' | 'receita';
type EntryStatus = 'confirmado' | 'previsto';

interface EntryPageProps {
  accounts: Account[];
  categories: CategoryState;
  onChange: (transactions: Transaction[]) => void;
  transactions: Transaction[];
}

interface EntryDraft {
  categoria: string;
  contaId: string;
  data: string;
  descricao: string;
  status: EntryStatus;
  tags: string;
  tipo: EntryType;
  valor: string;
}

const emptyDraft: EntryDraft = {
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
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return Number(normalized) || 0;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export function EntryPage({ accounts, categories, onChange, transactions }: EntryPageProps) {
  const [draft, setDraft] = useState<EntryDraft>(emptyDraft);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState('');
  const availableCategories = categories[draft.tipo] || [];

  const recentTransactions = useMemo(
    () => transactions.slice().sort(compareTransactionsDesc).slice(0, 5),
    [transactions]
  );

  function updateDraft(partial: Partial<EntryDraft>) {
    setDraft((current) => ({ ...current, ...partial }));
    setError('');
  }

  function clearForm() {
    setDraft({ ...emptyDraft, tipo: draft.tipo });
    setError('');
  }

  function saveEntry() {
    const value = parseMoney(draft.valor);
    if (!value || !draft.data || !draft.categoria || !draft.contaId) {
      setError('Preencha valor, data, categoria e conta para salvar.');
      return;
    }

    const now = new Date().toISOString();
    const transaction: Transaction = {
      id: createId('lancamento'),
      categoria: draft.categoria,
      conta_id: draft.contaId,
      data: draft.data,
      data_movimento: draft.data,
      desc: draft.descricao.trim(),
      descricao: draft.descricao.trim(),
      status: draft.status,
      tags: draft.tags.trim(),
      tipo: draft.tipo,
      valor: value,
      created_at: now,
      updated_at: now
    };

    onChange([...transactions, transaction]);
    setSavedTransaction(transaction);
    setDraft({ ...emptyDraft, tipo: draft.tipo });
    setError('');
  }

  return (
    <>
      <div className="modern-page-grid">
        <Card
          className={`modern-entry-card modern-entry-card--${draft.tipo}`}
          title="Novo Lançamento"
          subtitle="Registre receitas e despesas sem seleção automática de campos."
          toolbar={<Badge tone={draft.tipo === 'receita' ? 'income' : 'expense'}>{draft.tipo === 'receita' ? 'Receita' : 'Despesa'}</Badge>}
        >
          <div className="modern-preview-stack">
            <SegmentedControl
              onChange={(value) => updateDraft({ tipo: value as EntryType, categoria: '' })}
              options={[
                { label: 'Despesa', value: 'despesa' },
                { label: 'Receita', value: 'receita' }
              ]}
              value={draft.tipo}
            />

            <div className="modern-form-grid">
              <Input
                inputMode="decimal"
                label="Valor (R$)"
                onChange={(event) => updateDraft({ valor: event.target.value })}
                placeholder="0,00"
                value={draft.valor}
              />
              <Input
                label="Data"
                onChange={(event) => updateDraft({ data: event.target.value })}
                type="date"
                value={draft.data}
              />
              <Select
                label="Categoria"
                onChange={(event) => updateDraft({ categoria: event.target.value })}
                value={draft.categoria}
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
              <Select
                label="Conta"
                onChange={(event) => updateDraft({ contaId: event.target.value })}
                value={draft.contaId}
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => <option key={String(account.id)} value={String(account.id)}>{account.nome}</option>)}
              </Select>
            </div>

            <Input
              label="Descrição"
              onChange={(event) => updateDraft({ descricao: event.target.value })}
              placeholder={draft.tipo === 'receita' ? 'Ex: salário, freelance' : 'Ex: supermercado, farmácia'}
              value={draft.descricao}
            />
            <Input
              label="Tags"
              onChange={(event) => updateDraft({ tags: event.target.value })}
              placeholder="pessoal, fixo"
              value={draft.tags}
            />

            <div className="modern-thumb-toggle" role="group" aria-label="Status do lançamento">
              <button
                className={['modern-thumb-button', 'modern-thumb-button--confirmed', draft.status === 'confirmado' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => updateDraft({ status: 'confirmado' })}
                type="button"
              >
                <span>👍</span>
                Confirmado
              </button>
              <button
                className={['modern-thumb-button', 'modern-thumb-button--pending', draft.status === 'previsto' ? 'is-active' : ''].filter(Boolean).join(' ')}
                onClick={() => updateDraft({ status: 'previsto' })}
                type="button"
              >
                <span>👎</span>
                Pendente
              </button>
            </div>

            {error && <div className="modern-form-error">{error}</div>}

            <div className="modern-form-actions modern-form-actions--spread">
              <Button
                className={`modern-launch-submit modern-launch-submit--${draft.tipo}`}
                onClick={saveEntry}
                variant="primary"
              >
                Salvar Lançamento
              </Button>
              <Button onClick={clearForm}>Limpar</Button>
            </div>
          </div>
        </Card>

        <Card title="Últimos lançamentos" subtitle="Confirmados entram nos cálculos; pendentes ficam fora até confirmação.">
          <div className="modern-list">
            {recentTransactions.map((transaction) => (
              <div className="modern-list-row" key={String(transaction.id)}>
                <div>
                  <div className="modern-row-title">{getTransactionDescription(transaction) || transaction.categoria || 'Lançamento'}</div>
                  <div className="modern-row-subtitle">
                    {getTransactionDate(transaction) || 'Sem data'} · {transaction.categoria || 'Sem categoria'}
                  </div>
                </div>
                <div className="modern-row-actions">
                  <Badge tone={transaction.tipo === 'receita' ? 'income' : 'expense'}>{formatCurrency(transaction.valor)}</Badge>
                  <Badge tone={transaction.status === 'confirmado' ? 'success' : 'danger'}>
                    {transaction.status === 'confirmado' ? '👍 Confirmado' : '👎 Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
            {!recentTransactions.length && (
              <EmptyState title="Nenhum lançamento" text="Salve uma receita ou despesa para visualizar o histórico recente." />
            )}
          </div>
        </Card>
      </div>

      <Dialog
        confirmLabel="OK"
        onConfirm={() => setSavedTransaction(null)}
        open={Boolean(savedTransaction)}
        title="Lançamento salvo"
      >
        <div className="modern-dialog-success">
          <strong>{savedTransaction?.status === 'confirmado' ? 'Entrou nos cálculos confirmados.' : 'Ficou como pendente.'}</strong>
          <span>
            {savedTransaction?.tipo === 'receita' ? 'Receita' : 'Despesa'} de {formatCurrency(savedTransaction?.valor)} registrada com sucesso.
          </span>
        </div>
      </Dialog>
    </>
  );
}
