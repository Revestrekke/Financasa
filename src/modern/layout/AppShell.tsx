import type { ReactNode } from 'react';
import { Badge, Button, Card, EmptyState } from '../components';
import { NAV_ITEMS, SECTION_LABELS, type NavItem, type PageId } from '../navigation';

interface AppShellProps {
  activePage: PageId;
  children?: ReactNode;
  onNavigate: (page: PageId) => void;
  onSignOut?: () => void;
  userInitials?: string;
  userName?: string;
}

function groupedItems(section: NavItem['section']) {
  return NAV_ITEMS.filter((item) => item.section === section);
}

export function AppShell({ activePage, children, onNavigate, onSignOut, userInitials = 'FC', userName = 'FinanCasa' }: AppShellProps) {
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
                className={['modern-nav-item', activePage === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
                key={item.id}
                onClick={() => onNavigate(item.id)}
                type="button"
              >
                <span>{item.icon}</span>
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
            <span>Shell React preparado para receber esta tela na migração gradual.</span>
          </div>
          <div className="modern-topbar-actions">
            <Badge tone="success">React shell</Badge>
            {onSignOut && <Button onClick={onSignOut}>Sair</Button>}
          </div>
        </header>

        {children || (
          <Card title={activeItem.label} subtitle="Esta tela ainda está preservada no app legado.">
            <EmptyState
              text="Nas próximas etapas, cada funcionalidade será migrada para React mantendo o comportamento atual."
              title="Tela aguardando migração"
            />
          </Card>
        )}
      </main>
    </div>
  );
}
