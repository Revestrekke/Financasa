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
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', section: 'principal' },
  { id: 'lancamentos', label: 'Lançamentos', icon: '▧', section: 'principal' },
  { id: 'transacoes', label: 'Transações', icon: '⇅', section: 'principal' },
  { id: 'categorias', label: 'Categorias', icon: '◇', section: 'principal' },
  { id: 'orcamento', label: 'Orçamento', icon: '◔', section: 'planejamento' },
  { id: 'metas', label: 'Metas', icon: '◎', section: 'planejamento' },
  { id: 'contas', label: 'Contas', icon: '▤', section: 'planejamento' },
  { id: 'cartoes', label: 'Cartões', icon: '▣', section: 'planejamento' },
  { id: 'relatorios', label: 'Relatórios', icon: '▥', section: 'planejamento' },
  { id: 'recorrentes', label: 'Recorrentes', icon: '↻', section: 'planejamento' },
  { id: 'investimentos', label: 'Investimentos', icon: '↗', section: 'planejamento' },
  { id: 'usuarios', label: 'Usuários', icon: '◉', section: 'sistema' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '⌁', section: 'sistema' },
  { id: 'indicadores', label: 'Indicadores', icon: '▨', section: 'sistema' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙', section: 'sistema' },
  { id: 'integracoes', label: 'Integrações', icon: '☁', section: 'sistema' }
];

export const SECTION_LABELS = {
  principal: 'Principal',
  planejamento: 'Planejamento',
  sistema: 'Sistema'
} satisfies Record<NavItem['section'], string>;
