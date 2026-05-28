-- Zera os dados financeiros salvos, mantendo usuarios, perfis e compartilhamentos.
-- Rode no SQL Editor do Supabase quando quiser deixar o sistema como primeiro uso.

update public.financasa_workspaces
set
  state = jsonb_build_object(
    'transacoes', '[]'::jsonb,
    'contas', '[]'::jsonb,
    'metas', '[]'::jsonb,
    'categorias', jsonb_build_object(
      'despesa', jsonb_build_array('Aluguel','Alimentação','Transporte','Saúde','Lazer','Educação','Roupas','Contas','Outros'),
      'receita', jsonb_build_array('Salário','Freelance','Investimentos','Outras Receitas')
    ),
    'orcamento', '{}'::jsonb,
    'recorrentes', '[]'::jsonb,
    'investimentos', '[]'::jsonb,
    'filtroTx', 'todas',
    'tipoLanc', 'despesa'
  ),
  updated_at = now();

delete from public.financasa_state;
