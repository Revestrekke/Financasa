import './styles.css';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Button, Card, EmptyState } from './components';
import { AuthScreen } from './auth/AuthScreen';
import { AppShell } from './layout/AppShell';
import type { PageId } from './navigation';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CreditCardsPage } from './pages/CreditCardsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EntryPage } from './pages/EntryPage';
import { GoalsPage } from './pages/GoalsPage';
import { BudgetPage } from './pages/BudgetPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StrategicIndicatorsPage } from './pages/StrategicIndicatorsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { UsersAccessPage } from './pages/UsersAccessPage';
import { getUserInitials, getUserName, signOut as signOutSupabase } from './services/supabaseClient';
import {
  addWorkspaceUserByEmail,
  canEditWorkspace,
  canManageWorkspaceUsers,
  changeWorkspaceMemberRole,
  getCurrentUser,
  isMissingWorkspaceSchema,
  loadRemoteWorkspace,
  loadWorkspaceMembers,
  removeWorkspaceMember,
  saveRemoteDashboardLayout,
  saveRemoteFinanceState,
  updateRemoteProfileName,
  updateRemoteWorkspaceName,
  type FinanceWorkspace,
  type WorkspaceMember,
  type WorkspaceRole
} from './services/financePersistence';
import { createModernInitialState, hydrateModernFinanceState, type ModernFinanceState } from './state/financeState';

interface ModernRuntime {
  canEdit: boolean;
  canManageUsers: boolean;
  members: WorkspaceMember[];
  onAddMember: (email: string, role: WorkspaceRole) => Promise<void>;
  onChangeMemberRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  onReloadMembers: () => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onRenameWorkspace: (name: string) => Promise<void>;
  onReplaceState: (state: ModernFinanceState) => void;
  onSignOut: () => void;
  onUpdateProfile: (name: string) => Promise<void>;
  remoteStatus: string;
  user: User | null;
  workspace: FinanceWorkspace | null;
}

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [financeState, setFinanceState] = useState(createModernInitialState);
  const [preview, setPreview] = useState<'shell' | 'auth'>('shell');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [remoteStatus, setRemoteStatus] = useState('iniciando...');
  const [startupError, setStartupError] = useState('');
  const [workspace, setWorkspace] = useState<FinanceWorkspace | null>(null);
  const lastSavedDashboardLayoutJson = useRef('');
  const lastSavedJson = useRef('');

  async function loadRemoteForUser(user: User) {
    setBooting(true);
    setAuthUser(user);
    setStartupError('');
    setRemoteStatus('carregando Supabase...');
    try {
      const bundle = await loadRemoteWorkspace(user);
      setAuthUser(user);
      setWorkspace(bundle.workspace);
      setMembers(bundle.members);
      setFinanceState(bundle.financeState);
      lastSavedDashboardLayoutJson.current = JSON.stringify(bundle.financeState.dashboard_layout || {});
      lastSavedJson.current = JSON.stringify(bundle.financeState);
      setRemoteStatus('carregado do Supabase');
      setPreview('shell');
    } catch (error) {
      const schemaMissing = isMissingWorkspaceSchema(error);
      setRemoteStatus(schemaMissing ? 'schema Supabase ausente' : 'erro ao carregar');
      setStartupError(schemaMissing
        ? 'Execute database/supabase-schema.sql no Supabase antes de usar a versão moderna.'
        : error instanceof Error ? error.message : 'Não foi possível carregar sua área financeira.'
      );
      console.error(error);
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        const user = await getCurrentUser();
        if (user) {
          await loadRemoteForUser(user);
          return;
        }
        setRemoteStatus('aguardando login');
        setPreview('auth');
      } catch (error) {
        setRemoteStatus('erro de autenticação');
        setStartupError(error instanceof Error ? error.message : 'Não foi possível validar a sessão atual.');
        console.error(error);
      } finally {
        setBooting(false);
      }
    }

    void boot();
  }, []);

  useEffect(() => {
    if (!authUser || !workspace || booting) return;
    if (!canEditWorkspace(authUser, workspace, members)) {
      setRemoteStatus('somente leitura');
      return;
    }

    const snapshot = JSON.stringify(financeState);
    if (snapshot === lastSavedJson.current) return;

    setRemoteStatus('salvando...');
    const timer = window.setTimeout(async () => {
      try {
        await saveRemoteFinanceState(workspace.id, financeState);
        lastSavedJson.current = snapshot;
        setWorkspace((current) => current ? { ...current, updated_at: new Date().toISOString() } : current);
        setRemoteStatus('salvo no Supabase');
      } catch (error) {
        setRemoteStatus('erro ao salvar');
        console.error(error);
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [authUser, booting, financeState, members, workspace]);

  useEffect(() => {
    if (!authUser || !workspace || booting) return;
    if (!canEditWorkspace(authUser, workspace, members)) return;

    const dashboardLayout = financeState.dashboard_layout || {};
    const snapshot = JSON.stringify(dashboardLayout);
    if (snapshot === lastSavedDashboardLayoutJson.current) return;

    const timer = window.setTimeout(async () => {
      try {
        await saveRemoteDashboardLayout(authUser.id, dashboardLayout);
        lastSavedDashboardLayoutJson.current = snapshot;
        setRemoteStatus('layout salvo no Supabase');
      } catch (error) {
        setRemoteStatus('erro ao salvar layout');
        console.error(error);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [authUser, booting, financeState.dashboard_layout, members, workspace]);

  function updateFinance<Key extends keyof ModernFinanceState>(key: Key, value: ModernFinanceState[Key]) {
    if (!canEditWorkspace(authUser, workspace, members)) {
      setRemoteStatus('somente leitura');
      return;
    }
    setFinanceState((current) => ({ ...current, [key]: value }));
  }

  async function reloadMembers() {
    if (!workspace) return;
    const nextMembers = await loadWorkspaceMembers(workspace.id, authUser, workspace);
    setMembers(nextMembers);
  }

  async function handleAuthenticated() {
    const user = await getCurrentUser();
    if (user) {
      await loadRemoteForUser(user);
      return;
    }
    setStartupError('Login concluído, mas a sessão não foi encontrada. Tente entrar novamente.');
  }

  async function handleSignOut() {
    await signOutSupabase();
    setAuthUser(null);
    setWorkspace(null);
    setMembers([]);
    setFinanceState(createModernInitialState());
    lastSavedDashboardLayoutJson.current = '';
    lastSavedJson.current = '';
    setRemoteStatus('sessão encerrada');
    setPreview('auth');
  }

  async function handleUpdateProfile(name: string) {
    if (!authUser) return;
    await updateRemoteProfileName(authUser, name);
    setAuthUser({
      ...authUser,
      user_metadata: { ...(authUser.user_metadata || {}), name }
    });
    await reloadMembers();
  }

  async function handleAddMember(email: string, role: WorkspaceRole) {
    if (!workspace) return;
    await addWorkspaceUserByEmail(workspace.id, email, role);
    await reloadMembers();
  }

  async function handleChangeMemberRole(userId: string, role: WorkspaceRole) {
    if (!workspace) return;
    await changeWorkspaceMemberRole(workspace.id, userId, role);
    await reloadMembers();
  }

  async function handleRemoveMember(userId: string) {
    if (!workspace) return;
    await removeWorkspaceMember(workspace.id, userId);
    await reloadMembers();
  }

  async function handleRenameWorkspace(name: string) {
    if (!workspace) return;
    await updateRemoteWorkspaceName(workspace.id, name);
    setWorkspace((current) => current ? { ...current, name } : current);
  }

  const runtime: ModernRuntime = {
    canEdit: canEditWorkspace(authUser, workspace, members),
    canManageUsers: canManageWorkspaceUsers(authUser, workspace, members),
    members,
    onAddMember: handleAddMember,
    onChangeMemberRole: handleChangeMemberRole,
    onReloadMembers: reloadMembers,
    onRemoveMember: handleRemoveMember,
    onRenameWorkspace: handleRenameWorkspace,
    onReplaceState: (state) => setFinanceState(hydrateModernFinanceState(state)),
    onSignOut: () => void handleSignOut(),
    onUpdateProfile: handleUpdateProfile,
    remoteStatus,
    user: authUser,
    workspace
  };

  if (booting) {
    return (
      <div className="modern-app-shell">
        <Card title="Carregando FinanCasa" subtitle={remoteStatus}>
          <EmptyState title="Sincronizando dados" text="Aguarde enquanto sua área financeira é carregada." />
        </Card>
      </div>
    );
  }

  if (startupError) {
    return (
      <div className="modern-app-shell">
        <Card title="Não foi possível abrir a versão moderna" subtitle={remoteStatus}>
          <div className="modern-preview-stack">
            <EmptyState title="Carregamento interrompido" text={startupError} />
            <div className="modern-form-actions">
              {authUser && <Button onClick={() => void loadRemoteForUser(authUser)} variant="primary">Tentar novamente</Button>}
              <Button onClick={() => void handleSignOut()}>Sair</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (preview === 'auth') {
    return (
      <div className="modern-app-shell">
        <AuthScreen onAuthenticated={handleAuthenticated} />
      </div>
    );
  }

  if (preview === 'shell') {
    return (
      <AppShell
        activePage={activePage}
        canEdit={runtime.canEdit}
        onNavigate={setActivePage}
        onSignOut={runtime.onSignOut}
        syncStatus={runtime.remoteStatus}
        userInitials={getUserInitials(authUser)}
        userName={getUserName(authUser)}
      >
        {renderModernPage(activePage, financeState, updateFinance, setPreview, setActivePage, runtime)}
      </AppShell>
    );
  }

  return null;
}

function renderModernPage(
  activePage: PageId,
  financeState: ModernFinanceState,
  updateFinance: <Key extends keyof ModernFinanceState>(key: Key, value: ModernFinanceState[Key]) => void,
  setPreview: (preview: 'shell' | 'auth') => void,
  onNavigate: (page: PageId) => void,
  runtime: ModernRuntime
) {
  if (activePage === 'dashboard') {
    return (
      <DashboardPage
        canEdit={runtime.canEdit}
        dashboardLayout={financeState.dashboard_layout}
        financeState={financeState}
        onDashboardLayoutChange={(dashboardLayout) => updateFinance('dashboard_layout', dashboardLayout)}
        onNavigate={onNavigate}
      />
    );
  }

  if (activePage === 'categorias') {
    return (
      <CategoriesPage
        categories={financeState.categorias}
        onChange={(categorias) => updateFinance('categorias', categorias)}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'lancamentos') {
    return (
      <EntryPage
        accounts={financeState.contas}
        categories={financeState.categorias}
        onChange={(transacoes) => updateFinance('transacoes', transacoes)}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'transacoes') {
    return (
      <TransactionsPage
        accounts={financeState.contas}
        categories={financeState.categorias}
        onChange={(transacoes) => updateFinance('transacoes', transacoes)}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'metas') {
    return <GoalsPage goals={financeState.metas} onChange={(metas) => updateFinance('metas', metas)} />;
  }

  if (activePage === 'orcamento') {
    return (
      <BudgetPage
        budget={financeState.orcamento}
        categories={financeState.categorias}
        onChange={(orcamento) => updateFinance('orcamento', orcamento)}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'contas') {
    return (
      <AccountsPage
        accounts={financeState.contas}
        onChange={(contas) => updateFinance('contas', contas)}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'cartoes') {
    return (
      <CreditCardsPage
        accounts={financeState.contas}
        cards={financeState.cartoes}
        categories={financeState.categorias}
        invoices={financeState.faturas_cartao}
        onChange={({ invoices, transactions }) => {
          updateFinance('faturas_cartao', invoices);
          updateFinance('transacoes', transactions);
        }}
        transactions={financeState.transacoes}
      />
    );
  }

  if (activePage === 'relatorios') {
    return <ReportsPage financeState={financeState} />;
  }

  if (activePage === 'fluxo') {
    return <CashFlowPage financeState={financeState} />;
  }

  if (activePage === 'indicadores') {
    return <StrategicIndicatorsPage financeState={financeState} />;
  }

  if (activePage === 'usuarios') {
    return (
      <UsersAccessPage
        canManage={runtime.canManageUsers}
        members={runtime.members}
        onAddMember={runtime.onAddMember}
        onChangeRole={runtime.onChangeMemberRole}
        onReload={runtime.onReloadMembers}
        onRemoveMember={runtime.onRemoveMember}
        onSignOut={runtime.onSignOut}
        onUpdateProfile={runtime.onUpdateProfile}
        user={runtime.user}
        workspace={runtime.workspace}
      />
    );
  }

  if (activePage === 'configuracoes') {
    return (
      <SettingsPage
        canEdit={runtime.canEdit}
        financeState={financeState}
        onRenameWorkspace={runtime.onRenameWorkspace}
        onReplaceState={runtime.onReplaceState}
        remoteStatus={runtime.remoteStatus}
        workspace={runtime.workspace}
      />
    );
  }

  if (activePage === 'integracoes') {
    return <IntegrationsPage financeState={financeState} remoteStatus={runtime.remoteStatus} />;
  }

  if (activePage === 'investimentos') {
    return <InvestmentsPage investments={financeState.investimentos} onChange={(investimentos) => updateFinance('investimentos', investimentos)} />;
  }

  if (activePage === 'recorrentes') {
    return (
      <RecurringPage
        accounts={financeState.contas}
        categories={financeState.categorias}
        onChange={(recorrentes) => updateFinance('recorrentes', recorrentes)}
        recurring={financeState.recorrentes}
      />
    );
  }

  return (
    <Card
      title="Tela indisponível"
      subtitle="Não foi possível abrir esta seção."
      toolbar={<Button onClick={() => setPreview('auth')} variant="ghost">Ver autenticação</Button>}
    >
      <EmptyState
        action={<Button onClick={() => setPreview('auth')} variant="primary">Ver autenticação</Button>}
        text="Volte para a autenticação ou selecione outra opção do menu."
        title="Seção indisponível"
      />
    </Card>
  );
}
