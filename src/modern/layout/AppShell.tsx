import type { ReactNode } from 'react';
import { Button, Card, EmptyState } from '../components';
import { NAV_ITEMS, SECTION_LABELS, type NavItem, type PageId } from '../navigation';

interface AppShellProps {
  activePage: PageId;
  canEdit?: boolean;
  children?: ReactNode;
  onNavigate: (page: PageId) => void;
  onSignOut?: () => void;
  syncStatus?: string;
  userInitials?: string;
  userName?: string;
}

function groupedItems(section: NavItem['section']) {
  return NAV_ITEMS.filter((item) => item.section === section);
}

export function AppShell({
  activePage,
  canEdit = true,
  children,
  onNavigate,
  onSignOut,
  userInitials = 'FC',
  userName = 'FinanCasa'
}: AppShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0];

  return (
    <div className="modern-shell">
      <aside className="modern-sidebar">
        <div className="modern-brand">FinanCasa</div>
        <div className="modern-user-card">
          <div className="modern-avatar">{userInitials}</div>
          <div>
            <div className="modern-user-name">{userName}</div>
            <div className="modern-user-role">Área financeira</div>
          </div>
        </div>

        {(['principal', 'planejamento', 'sistema'] as const).map((section) => (
          <nav className="modern-nav-section" key={section}>
            <div className="modern-nav-title">{SECTION_LABELS[section]}</div>
            {groupedItems(section).map((item) => (
              <button
                aria-current={activePage === item.id ? 'page' : undefined}
                className={['modern-nav-item', activePage === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <span className="modern-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        ))}
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="modern-app-title">
            <strong>{activeItem.label}</strong>
            <span>{activeItem.summary}</span>
          </div>
          <div className="modern-topbar-actions">
            {onSignOut && <Button onClick={onSignOut}>Sair</Button>}
          </div>
        </header>

        {children || (
          <Card title={activeItem.label} subtitle="Não foi possível carregar esta seção.">
            <EmptyState
              text="Selecione outra opção do menu ou atualize a página."
              title="Seção indisponível"
            />
          </Card>
        )}
      </main>
    </div>
  );
}
