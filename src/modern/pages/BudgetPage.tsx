import { useEffect, useMemo, useState } from 'react';
import { getBudgetSummary } from '../../domain/budget';
import { Badge, Button, Card, Dialog, EmptyState, Input } from '../components';
import type { CategoryState, ModernFinanceState } from '../state/financeState';

interface BudgetPageProps {
  budget: ModernFinanceState['orcamento'];
  categories: CategoryState;
  onChange: (budget: ModernFinanceState['orcamento']) => void;
  transactions: ModernFinanceState['transacoes'];
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return Math.max(0, Number(normalized) || 0);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function createDraft(categories: string[], budget: ModernFinanceState['orcamento']) {
  return categories.reduce<Record<string, string>>((acc, category) => {
    const value = Number(budget[category]) || 0;
    acc[category] = value ? String(value).replace('.', ',') : '';
    return acc;
  }, {});
}

export function BudgetPage({ budget, categories, onChange, transactions }: BudgetPageProps) {
  const [month, setMonth] = useState(currentMonth);
  const [draft, setDraft] = useState(() => createDraft(categories.despesa, budget));
  const [saved, setSaved] = useState(false);
  const summary = useMemo(() => getBudgetSummary(budget, transactions, month), [budget, month, transactions]);
  const expenseCategories = categories.despesa;

  useEffect(() => {
    setDraft(createDraft(categories.despesa, budget));
  }, [budget, categories.despesa]);

  function updateDraft(category: string, value: string) {
    setDraft((current) => ({ ...current, [category]: value }));
  }

  function saveBudget() {
    const next = expenseCategories.reduce<Record<string, number>>((acc, category) => {
      const value = parseMoney(draft[category] || '');
      if (value > 0) acc[category] = value;
      return acc;
    }, {});
    onChange(next);
    setSaved(true);
  }

  function clearCategory(category: string) {
    setDraft((current) => ({ ...current, [category]: '' }));
    const nextBudget = { ...budget };
    delete nextBudget[category];
    onChange(nextBudget);
  }

  return (
    <div className="modern-page-grid modern-budget-page">
      <Card
        title="Orçamento"
        subtitle="Limites por categoria de despesa"
        toolbar={<Badge tone={summary.available >= 0 ? 'success' : 'expense'}>{summary.pct}% usado</Badge>}
      >
        <div className="modern-budget-toolbar">
          <Input label="Mês analisado" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
          <div className="modern-budget-toolbar-summary">
            <span>{monthLabel(month)}</span>
            <strong className={summary.available >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(summary.available)}</strong>
          </div>
        </div>

        <div className="modern-budget-editor">
          {expenseCategories.map((category) => {
            const item = summary.items.find((summaryItem) => summaryItem.category === category);
            const spent = item?.spent || 0;
            const limit = Number(budget[category]) || 0;
            const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
            const exceeded = limit > 0 && spent > limit;

            return (
              <div className="modern-budget-edit-row" key={category}>
                <div className="modern-budget-edit-main">
                  <div>
                    <strong>{category}</strong>
                    <span>{formatCurrency(spent)} gasto no mês</span>
                  </div>
                  <div className="modern-progress-line">
                    <i className={exceeded ? 'is-danger' : ''} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <Input
                  aria-label={`Limite de ${category}`}
                  label="Limite"
                  onChange={(event) => updateDraft(category, event.target.value)}
                  placeholder="0,00"
                  value={draft[category] || ''}
                />
                <Button disabled={!limit && !draft[category]} onClick={() => clearCategory(category)} variant="ghost">Limpar</Button>
              </div>
            );
          })}
        </div>

        <div className="modern-form-actions">
          <Button onClick={saveBudget} variant="primary">Salvar orçamento</Button>
        </div>
      </Card>

      <Card title="Resumo do orçamento" subtitle="Apenas despesas confirmadas entram no realizado">
        <div className="modern-budget-summary-grid">
          <div>
            <span>Limite total</span>
            <strong>{formatCurrency(summary.totalLimit)}</strong>
          </div>
          <div>
            <span>Gasto confirmado</span>
            <strong className="modern-value-expense">{formatCurrency(summary.totalSpent)}</strong>
          </div>
          <div>
            <span>Disponível</span>
            <strong className={summary.available >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(summary.available)}</strong>
          </div>
        </div>

        <div className="modern-list">
          {summary.items.map((item) => {
            const available = item.limit - item.spent;
            return (
              <div className="modern-compact-row" key={item.category}>
                <span>{item.category}</span>
                <strong className={available >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(available)}</strong>
              </div>
            );
          })}
          {!summary.items.length && <EmptyState title="Sem limites cadastrados" text="Defina limites nas categorias de despesa para acompanhar o mês." />}
        </div>
      </Card>

      <Dialog confirmLabel="OK" onConfirm={() => setSaved(false)} open={saved} title="Orçamento salvo">
        <div className="modern-dialog-success">
          <strong>Limites atualizados com sucesso.</strong>
          <span>O dashboard e os indicadores já passam a usar esses valores.</span>
        </div>
      </Dialog>
    </div>
  );
}
