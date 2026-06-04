export type PageId =
  | 'dashboard'
  | 'lancamentos'
  | 'transacoes'
  | 'categorias'
  | 'orcamento'
  | 'metas'
  | 'contas'
  | 'cartoes'
  | 'relatorios'
  | 'recorrentes'
  | 'investimentos'
  | 'usuarios'
  | 'fluxo'
  | 'indicadores'
  | 'configuracoes'
  | 'integracoes';

export interface NavItem {
  icon: string;
  id: PageId;
  label: string;
  section: 'principal' | 'planejamento' | 'sistema';
  summary: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', section: 'principal', summary: 'Resumo geral da área financeira.' },
  { id: 'lancamentos', label: 'Lançamentos', icon: '▧', section: 'principal', summary: 'Registro de receitas e despesas.' },
  { id: 'transacoes', label: 'Transações', icon: '⇅', section: 'principal', summary: 'Histórico financeiro consolidado.' },
  { id: 'categorias', label: 'Categorias', icon: '◇', section: 'principal', summary: 'Organização de receitas e despesas.' },
  { id: 'orcamento', label: 'Orçamento', icon: '◔', section: 'planejamento', summary: 'Limites mensais por categoria.' },
  { id: 'metas', label: 'Metas', icon: '◎', section: 'planejamento', summary: 'Objetivos financeiros acompanhados.' },
  { id: 'contas', label: 'Contas', icon: '▤', section: 'planejamento', summary: 'Saldos de contas e carteiras.' },
  { id: 'cartoes', label: 'Cartões', icon: '▣', section: 'planejamento', summary: 'Faturas, compras e cartões.' },
  { id: 'relatorios', label: 'Relatórios', icon: '▥', section: 'planejamento', summary: 'Análise mensal e categorias.' },
  { id: 'recorrentes', label: 'Recorrentes', icon: '↻', section: 'planejamento', summary: 'Lançamentos fixos e programados.' },
  { id: 'investimentos', label: 'Investimentos', icon: '↗', section: 'planejamento', summary: 'Carteira e rentabilidade.' },
  { id: 'usuarios', label: 'Usuários', icon: '◉', section: 'sistema', summary: 'Perfil e permissões de acesso.' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '⌁', section: 'sistema', summary: 'Projeção de entradas e saídas.' },
  { id: 'indicadores', label: 'Indicadores', icon: '▨', section: 'sistema', summary: 'Patrimônio, poupança e comprometimento.' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙', section: 'sistema', summary: 'Área financeira, backup e restauração.' },
  { id: 'integracoes', label: 'Integrações', icon: '☁', section: 'sistema', summary: 'Supabase, CSV e conexões externas.' }
];

export const SECTION_LABELS = {
  principal: 'Principal',
  planejamento: 'Planejamento',
  sistema: 'Sistema'
} satisfies Record<NavItem['section'], string>;
