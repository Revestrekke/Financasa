import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Select } from '../components';
import { createId, type CategoryState, type ModernRecurringTransaction } from '../state/financeState';
import type { Account } from '../../domain/types';

interface RecurringPageProps {
  accounts: Account[];
  categories: CategoryState;
  onChange: (recurring: ModernRecurringTransaction[]) => void;
  recurring: ModernRecurringTransaction[];
}

const emptyRecurring: Omit<ModernRecurringTransaction, 'id'> = {
  desc: '',
  valor: 0,
  tipo: 'despesa',
  categoria: 'Aluguel',
  conta_id: '',
  frequencia: 'mensal',
  dia: 1
};

export function RecurringPage({ accounts, categories, onChange, recurring }: RecurringPageProps) {
  const [draft, setDraft] = useState(emptyRecurring);
  const [editingId, setEditingId] = useState<string | null>(null);
  const availableCategories = categories[draft.tipo] || [];

  function save() {
    if (!draft.desc.trim() || !draft.valor) return;
    const payload = { ...draft, valor: Number(draft.valor) || 0, dia: Number(draft.dia) || 1, conta_id: draft.conta_id || String(accounts[0]?.id || '') };
    onChange(editingId
      ? recurring.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      : [...recurring, { id: createId('recorrente'), ...payload }]);
    setDraft(emptyRecurring);
    setEditingId(null);
  }

  function edit(item: ModernRecurringTransaction) {
    setEditingId(item.id);
    setDraft({
      desc: item.desc,
      valor: item.valor,
      tipo: item.tipo,
      categoria: item.categoria || '',
      conta_id: item.conta_id,
      frequencia: item.frequencia,
      dia: item.dia
    });
  }

  return (
    <div className="modern-page-grid">
      <Card title={editingId ? 'Editar Recorrente' : 'Novo Recorrente'} subtitle="Cadastre lançamentos fixos mensais, semanais ou anuais.">
        <div className="modern-form-grid">
          <Input label="Descrição" onChange={(event) => setDraft({ ...draft, desc: event.target.value })} placeholder="Aluguel" value={draft.desc} />
          <Input label="Valor" onChange={(event) => setDraft({ ...draft, valor: Number(event.target.value) })} type="number" value={draft.valor || ''} />
          <Select label="Tipo" onChange={(event) => setDraft({ ...draft, tipo: event.target.value as 'despesa' | 'receita', categoria: categories[event.target.value as 'despesa' | 'receita']?.[0] || '' })} value={draft.tipo}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </Select>
          <Select label="Categoria" onChange={(event) => setDraft({ ...draft, categoria: event.target.value })} value={draft.categoria}>
            {availableCategories.map((category) => <option key={category}>{category}</option>)}
          </Select>
          <Select label="Conta" onChange={(event) => setDraft({ ...draft, conta_id: event.target.value })} value={draft.conta_id}>
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => <option key={String(account.id)} value={String(account.id)}>{account.nome}</option>)}
          </Select>
          <Select label="Frequência" onChange={(event) => setDraft({ ...draft, frequencia: event.target.value as ModernRecurringTransaction['frequencia'] })} value={draft.frequencia}>
            <option value="mensal">Mensal</option>
            <option value="quinzenal">Quinzenal</option>
            <option value="semanal">Semanal</option>
            <option value="anual">Anual</option>
          </Select>
          <Input label="Dia" max={28} min={1} onChange={(event) => setDraft({ ...draft, dia: Number(event.target.value) })} type="number" value={draft.dia} />
        </div>
        <div className="modern-form-actions">
          <Button onClick={save} variant="primary">{editingId ? 'Salvar Recorrente' : 'Adicionar Recorrente'}</Button>
          <Button onClick={() => { setDraft(emptyRecurring); setEditingId(null); }}>Limpar</Button>
        </div>
      </Card>

      <Card title="Recorrentes cadastrados" subtitle={`${recurring.length} recorrente(s)`}>
        <div className="modern-list">
          {recurring.map((item) => (
            <div className="modern-list-row" key={item.id}>
              <div>
                <div className="modern-row-title">{item.desc}</div>
                <div className="modern-row-subtitle">{item.frequencia} · dia {item.dia} · {item.categoria}</div>
              </div>
              <div className="modern-row-actions">
                <Badge tone={item.tipo === 'receita' ? 'income' : 'expense'}>{item.tipo === 'receita' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR')}</Badge>
                <Button onClick={() => edit(item)} variant="ghost">Editar</Button>
                <Button onClick={() => onChange(recurring.filter((entry) => entry.id !== item.id))} variant="danger">Remover</Button>
              </div>
            </div>
          ))}
          {!recurring.length && <EmptyState title="Nenhum recorrente" text="Cadastre despesas ou receitas recorrentes." />}
        </div>
      </Card>
    </div>
  );
}
