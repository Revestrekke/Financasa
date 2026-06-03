import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Select } from '../components';
import { calculateAccountBalance } from '../../domain/accounts';
import { createId, type ModernFinanceState } from '../state/financeState';
import type { Account } from '../../domain/types';

interface AccountsPageProps {
  accounts: Account[];
  onChange: (accounts: Account[]) => void;
  transactions: ModernFinanceState['transacoes'];
}

const emptyAccount = { nome: '', tipo: 'Conta corrente', saldo_inicial: 0, ativo: true };

export function AccountsPage({ accounts, onChange, transactions }: AccountsPageProps) {
  const [draft, setDraft] = useState(emptyAccount);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  function save() {
    if (!draft.nome.trim()) return;
    const payload = { ...draft, saldo_inicial: Number(draft.saldo_inicial) || 0 };
    onChange(editingId
      ? accounts.map((account) => (String(account.id) === String(editingId) ? { ...account, ...payload } : account))
      : [...accounts, { id: createId('conta'), ...payload }]);
    setDraft(emptyAccount);
    setEditingId(null);
  }

  function edit(account: Account) {
    setEditingId(account.id || null);
    setDraft({ nome: account.nome || '', tipo: account.tipo || 'Conta corrente', saldo_inicial: Number(account.saldo_inicial) || 0, ativo: account.ativo !== false });
  }

  return (
    <div className="modern-page-grid">
      <Card title={editingId ? 'Editar Conta' : 'Nova Conta'} subtitle="Cadastre carteiras, bancos e saldos iniciais.">
        <div className="modern-form-grid">
          <Input label="Nome" onChange={(event) => setDraft({ ...draft, nome: event.target.value })} placeholder="Banco do Brasil" value={draft.nome} />
          <Select label="Tipo" onChange={(event) => setDraft({ ...draft, tipo: event.target.value })} value={draft.tipo}>
            <option>Conta corrente</option>
            <option>Carteira</option>
            <option>Investimento</option>
          </Select>
          <Input label="Saldo inicial" onChange={(event) => setDraft({ ...draft, saldo_inicial: Number(event.target.value) })} type="number" value={draft.saldo_inicial} />
        </div>
        <div className="modern-form-actions">
          <Button onClick={save} variant="primary">{editingId ? 'Salvar Conta' : 'Adicionar Conta'}</Button>
          <Button onClick={() => { setDraft(emptyAccount); setEditingId(null); }}>Limpar</Button>
        </div>
      </Card>

      <Card title="Contas e carteiras" subtitle={`${accounts.length} conta(s)`}>
        <div className="modern-list">
          {accounts.map((account) => {
            const balance = calculateAccountBalance(account, transactions);
            return (
              <div className="modern-list-row" key={String(account.id)}>
                <div>
                  <div className="modern-row-title">{account.nome}</div>
                  <div className="modern-row-subtitle">{account.tipo} · inicial R$ {Number(account.saldo_inicial || 0).toLocaleString('pt-BR')}</div>
                </div>
                <div className="modern-row-actions">
                  <Badge tone={balance >= 0 ? 'income' : 'expense'}>R$ {balance.toLocaleString('pt-BR')}</Badge>
                  <Button onClick={() => edit(account)} variant="ghost">Editar</Button>
                  <Button onClick={() => onChange(accounts.filter((item) => item.id !== account.id))} variant="danger">Remover</Button>
                </div>
              </div>
            );
          })}
          {!accounts.length && <EmptyState title="Nenhuma conta cadastrada" text="Adicione uma conta para começar a registrar lançamentos." />}
        </div>
      </Card>
    </div>
  );
}
