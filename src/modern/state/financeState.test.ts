import { describe, expect, it } from 'vitest';
import { createModernInitialState, hydrateModernFinanceState } from './financeState';

describe('estado moderno inicial', () => {
  it('inicia sem dados demonstrativos em workspaces reais', () => {
    const state = createModernInitialState();

    expect(state.contas).toEqual([]);
    expect(state.cartoes).toEqual([]);
    expect(state.faturas_cartao).toEqual([]);
    expect(state.investimentos).toEqual([]);
    expect(state.metas).toEqual([]);
    expect(state.orcamento).toEqual({});
    expect(state.recorrentes).toEqual([]);
    expect(state.transacoes).toEqual([]);
    expect(state.categorias.despesa.length).toBeGreaterThan(0);
    expect(state.categorias.receita.length).toBeGreaterThan(0);
  });

  it('preserva arrays vazios vindos do legado sem repovoar com exemplos', () => {
    const state = hydrateModernFinanceState({
      contas: [],
      cartoes: [],
      faturas_cartao: [],
      investimentos: [],
      metas: [],
      recorrentes: [],
      transacoes: []
    });

    expect(state.contas).toEqual([]);
    expect(state.cartoes).toEqual([]);
    expect(state.transacoes).toEqual([]);
  });

  it('preserva o layout salvo do dashboard moderno', () => {
    const dashboardLayout = {
      hidden: ['alertas'],
      order: ['orcamento', 'metas'],
      sizes: { orcamento: 'large' }
    };
    const state = hydrateModernFinanceState({ dashboard_layout: dashboardLayout });

    expect(state.dashboard_layout).toEqual(dashboardLayout);
  });
});
