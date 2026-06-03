import { useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Input } from '../components';
import { getGoalProgress } from '../../domain/goals';
import { createId, type GoalState } from '../state/financeState';

interface GoalsPageProps {
  goals: GoalState[];
  onChange: (goals: GoalState[]) => void;
}

const emptyGoal = { atual: 0, alvo: 0, icone: '◎', nome: '', prazo: '' };

export function GoalsPage({ goals, onChange }: GoalsPageProps) {
  const [draft, setDraft] = useState(emptyGoal);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sortedGoals = useMemo(() => goals.slice().sort((a, b) => getGoalProgress(b) - getGoalProgress(a)), [goals]);

  function save() {
    if (!draft.nome.trim() || !draft.alvo) return;
    const payload = { ...draft, atual: Number(draft.atual) || 0, alvo: Number(draft.alvo) || 0 };
    onChange(editingId
      ? goals.map((goal) => (goal.id === editingId ? { ...goal, ...payload } : goal))
      : [...goals, { id: createId('meta'), ...payload }]);
    setDraft(emptyGoal);
    setEditingId(null);
  }

  function edit(goal: GoalState) {
    setEditingId(goal.id);
    setDraft({ atual: goal.atual, alvo: goal.alvo, icone: goal.icone || '◎', nome: goal.nome, prazo: goal.prazo || '' });
  }

  return (
    <div className="modern-page-grid">
      <Card title={editingId ? 'Editar Meta' : 'Nova Meta'} subtitle="Controle objetivo, valor atual, alvo e prazo.">
        <div className="modern-form-grid">
          <Input label="Nome" onChange={(event) => setDraft({ ...draft, nome: event.target.value })} placeholder="Reserva de emergência" value={draft.nome} />
          <Input label="Ícone" onChange={(event) => setDraft({ ...draft, icone: event.target.value })} placeholder="◎" value={draft.icone} />
          <Input label="Atual" onChange={(event) => setDraft({ ...draft, atual: Number(event.target.value) })} type="number" value={draft.atual || ''} />
          <Input label="Alvo" onChange={(event) => setDraft({ ...draft, alvo: Number(event.target.value) })} type="number" value={draft.alvo || ''} />
          <Input label="Prazo" onChange={(event) => setDraft({ ...draft, prazo: event.target.value })} type="date" value={draft.prazo} />
        </div>
        <div className="modern-form-actions">
          <Button onClick={save} variant="primary">{editingId ? 'Salvar Meta' : 'Adicionar Meta'}</Button>
          <Button onClick={() => { setDraft(emptyGoal); setEditingId(null); }}>Limpar</Button>
        </div>
      </Card>

      <Card title="Metas cadastradas" subtitle={`${goals.length} meta(s)`}>
        <div className="modern-list">
          {sortedGoals.map((goal) => {
            const progress = getGoalProgress(goal);
            return (
              <div className="modern-list-row" key={goal.id}>
                <div>
                  <div className="modern-row-title">{goal.icone || '◎'} {goal.nome}</div>
                  <div className="modern-row-subtitle">R$ {goal.atual.toLocaleString('pt-BR')} / R$ {goal.alvo.toLocaleString('pt-BR')}{goal.prazo ? ` · até ${goal.prazo}` : ''}</div>
                </div>
                <div className="modern-row-actions">
                  <Badge tone={progress >= 100 ? 'success' : 'warning'}>{progress}%</Badge>
                  <Button onClick={() => edit(goal)} variant="ghost">Editar</Button>
                  <Button onClick={() => onChange(goals.filter((item) => item.id !== goal.id))} variant="danger">Remover</Button>
                </div>
              </div>
            );
          })}
          {!goals.length && <EmptyState title="Nenhuma meta criada" text="Crie metas para acompanhar sua evolução." />}
        </div>
      </Card>
    </div>
  );
}
