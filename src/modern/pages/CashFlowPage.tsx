import { useMemo, useState } from 'react';
import { Badge, Card, EmptyState, Input, Select } from '../components';
import { getCashFlowProjection } from '../../domain/reports';
import type { ModernFinanceState } from '../state/financeState';

interface CashFlowPageProps {
  financeState: ModernFinanceState;
}

function formatCurrency(value?: number | string) {
  return `R$ ${(Number(value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-');
  return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function CashFlowPage({ financeState }: CashFlowPageProps) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [length, setLength] = useState(6);
  const projection = useMemo(() => getCashFlowProjection(financeState, month, length), [financeState, length, month]);
  const finalBalance = projection[projection.length - 1]?.saldoProjetado || 0;
  const totalPlannedInvoices = projection.reduce((sum, item) => sum + item.faturasPrevistas, 0);
  const totalConfirmedIncome = projection.reduce((sum, item) => sum + item.receitasConfirmadas, 0);

  return (
    <div className="modern-report-page">
      <Card
        title="Fluxo de Caixa"
        subtitle="Projeção com realizados confirmados e faturas previstas separadas."
      >
        <div className="modern-flow-controls">
          <Input label="Início" onChange={(event) => setMonth(event.target.value)} type="month" value={month} />
          <Select label="Período" onChange={(event) => setLength(Number(event.target.value))} value={length}>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </Select>
        </div>
        <div className="modern-report-kpis">
          <div><span>Saldo final projetado</span><strong className={finalBalance >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(finalBalance)}</strong></div>
          <div><span>Receitas confirmadas</span><strong>{formatCurrency(totalConfirmedIncome)}</strong></div>
          <div><span>Faturas previstas</span><strong className="modern-value-transfer">{formatCurrency(totalPlannedInvoices)}</strong></div>
          <div><span>Meses analisados</span><strong>{projection.length}</strong></div>
        </div>
      </Card>

      <Card title="Projeção Mensal" subtitle="Saldo mês a mês">
        <div className="modern-flow-table">
          <div className="modern-flow-head">
            <span>Mês</span>
            <span>Receitas</span>
            <span>Despesas</span>
            <span>Faturas</span>
            <span>Variação</span>
            <span>Saldo projetado</span>
          </div>
          {projection.map((item) => (
            <div className="modern-flow-row" key={item.month}>
              <strong>{monthLabel(item.month)}</strong>
              <Badge tone="income">{formatCurrency(item.receitasConfirmadas)}</Badge>
              <Badge tone="expense">{formatCurrency(item.despesasConfirmadas)}</Badge>
              <Badge tone="warning">{formatCurrency(item.faturasPrevistas)}</Badge>
              <strong className={item.variacaoProjetada >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(item.variacaoProjetada)}</strong>
              <strong className={item.saldoProjetado >= 0 ? 'modern-value-income' : 'modern-value-expense'}>{formatCurrency(item.saldoProjetado)}</strong>
            </div>
          ))}
          {!projection.length && <EmptyState title="Sem projeção" text="Escolha um período para gerar o fluxo." />}
        </div>
      </Card>
    </div>
  );
}
