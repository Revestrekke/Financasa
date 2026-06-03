import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Input } from '../components';
import type { CategoryState, ModernFinanceState } from '../state/financeState';

interface CategoriesPageProps {
  categories: CategoryState;
  onChange: (categories: CategoryState) => void;
  transactions: ModernFinanceState['transacoes'];
}

type CategoryType = keyof CategoryState;

function labelFor(type: CategoryType) {
  return type === 'despesa' ? 'Despesa' : 'Receita';
}

export function CategoriesPage({ categories, onChange, transactions }: CategoriesPageProps) {
  const [draft, setDraft] = useState<Record<CategoryType, string>>({ despesa: '', receita: '' });
  const [editing, setEditing] = useState<{ index: number; type: CategoryType } | null>(null);

  function save(type: CategoryType) {
    const name = draft[type].trim();
    if (!name) return;
    const list = categories[type];
    const duplicated = list.some((item, index) => item.toLowerCase() === name.toLowerCase() && index !== editing?.index);
    if (duplicated) return;
    const next = editing?.type === type
      ? list.map((item, index) => (index === editing.index ? name : item))
      : [...list, name];
    onChange({ ...categories, [type]: next });
    setDraft((current) => ({ ...current, [type]: '' }));
    setEditing(null);
  }

  function edit(type: CategoryType, index: number) {
    setEditing({ type, index });
    setDraft((current) => ({ ...current, [type]: categories[type][index] }));
  }

  function remove(type: CategoryType, category: string) {
    const used = transactions.some((tx) => tx.tipo === type && tx.categoria === category);
    if (used) return;
    onChange({ ...categories, [type]: categories[type].filter((item) => item !== category) });
  }

  return (
    <div className="modern-page-grid">
      {(['despesa', 'receita'] as CategoryType[]).map((type) => (
        <Card key={type} title={`Categorias de ${labelFor(type)}`} subtitle="Adicionar, editar e remover categorias simples.">
          <div className="modern-inline-form">
            <Input label="Nome" onChange={(event) => setDraft((current) => ({ ...current, [type]: event.target.value }))} placeholder="Ex: Mercado" value={draft[type]} />
            <Button onClick={() => save(type)} variant="primary">{editing?.type === type ? 'Salvar' : 'Adicionar'}</Button>
          </div>
          <div className="modern-list">
            {categories[type].map((category, index) => {
              const used = transactions.some((tx) => tx.tipo === type && tx.categoria === category);
              return (
                <div className="modern-list-row" key={category}>
                  <div>
                    <div className="modern-row-title">{category}</div>
                    <div className="modern-row-subtitle">{used ? 'Em uso em lançamentos' : 'Disponível'}</div>
                  </div>
                  <div className="modern-row-actions">
                    <Badge tone={type === 'receita' ? 'income' : 'expense'}>{labelFor(type)}</Badge>
                    <Button onClick={() => edit(type, index)} variant="ghost">Editar</Button>
                    <Button disabled={used} onClick={() => remove(type, category)} variant="danger">Remover</Button>
                  </div>
                </div>
              );
            })}
            {!categories[type].length && <EmptyState title="Nenhuma categoria" text="Cadastre a primeira categoria para esta lista." />}
          </div>
        </Card>
      ))}
    </div>
  );
}
