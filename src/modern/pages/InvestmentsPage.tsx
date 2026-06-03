import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Input, Select } from '../components';
import { createId, type InvestmentState } from '../state/financeState';

interface InvestmentsPageProps {
  investments: InvestmentState[];
  onChange: (investments: InvestmentState[]) => void;
}

const emptyInvestment = { nome: '', tipo: 'Renda fixa', valor: 0, rent: 0 };

export function InvestmentsPage({ investments, onChange }: InvestmentsPageProps) {
  const [draft, setDraft] = useState(emptyInvestment);
  const [editingId, setEditingId] = useState<string | null>(null);
  const total = investments.reduce((sum, investment) => sum + investment.valor, 0);

  function save() {
    if (!draft.nome.trim() || !draft.valor) return;
    const payload = { ...draft, valor: Number(draft.valor) || 0, rent: Number(draft.rent) || 0 };
    onChange(editingId
      ? investments.map((investment) => (investment.id === editingId ? { ...investment, ...payload } : investment))
      : [...investments, { id: createId('investimento'), ...payload }]);
    setDraft(emptyInvestment);
    setEditingId(null);
  }

  function edit(investment: InvestmentState) {
    setEditingId(investment.id);
    setDraft({ nome: investment.nome, tipo: investment.tipo, valor: investment.valor, rent: investment.rent });
  }

  return (
    <div className="modern-page-grid">
      <Card title={editingId ? 'Editar Investimento' : 'Novo Investimento'} subtitle="Acompanhe carteira, rentabilidade e valor aplicado.">
        <div className="modern-form-grid">
          <Input label="Nome" onChange={(event) => setDraft({ ...draft, nome: event.target.value })} placeholder="Tesouro Selic" value={draft.nome} />
          <Select label="Tipo" onChange={(event) => setDraft({ ...draft, tipo: event.target.value })} value={draft.tipo}>
            <option>Renda fixa</option>
            <option>Fundo</option>
            <option>Ações</option>
            <option>Cripto</option>
          </Select>
          <Input label="Valor" onChange={(event) => setDraft({ ...draft, valor: Number(event.target.value) })} type="number" value={draft.valor || ''} />
          <Input label="Rentabilidade (%)" onChange={(event) => setDraft({ ...draft, rent: Number(event.target.value) })} type="number" value={draft.rent || ''} />
        </div>
        <div className="modern-form-actions">
          <Button onClick={save} variant="primary">{editingId ? 'Salvar Investimento' : 'Adicionar Investimento'}</Button>
          <Button onClick={() => { setDraft(emptyInvestment); setEditingId(null); }}>Limpar</Button>
        </div>
      </Card>

      <Card title="Carteira" subtitle={`Total R$ ${total.toLocaleString('pt-BR')}`}>
        <div className="modern-list">
          {investments.map((investment) => (
            <div className="modern-list-row" key={investment.id}>
              <div>
                <div className="modern-row-title">{investment.nome}</div>
                <div className="modern-row-subtitle">{investment.tipo} · {investment.rent.toFixed(2).replace('.', ',')}%</div>
              </div>
              <div className="modern-row-actions">
                <Badge tone="income">R$ {investment.valor.toLocaleString('pt-BR')}</Badge>
                <Button onClick={() => edit(investment)} variant="ghost">Editar</Button>
                <Button onClick={() => onChange(investments.filter((item) => item.id !== investment.id))} variant="danger">Remover</Button>
              </div>
            </div>
          ))}
          {!investments.length && <EmptyState title="Nenhum investimento" text="Cadastre aplicações para acompanhar sua carteira." />}
        </div>
      </Card>
    </div>
  );
}
