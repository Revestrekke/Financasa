import './styles.css';
import { useState } from 'react';
import { Badge, Button, Card, Dialog, EmptyState, Input, SegmentedControl, Select, Table } from './components';
import { AuthScreen } from './auth/AuthScreen';
import { AppShell } from './layout/AppShell';
import type { PageId } from './navigation';
import { AccountsPage } from './pages/AccountsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { EntryPage } from './pages/EntryPage';
import { GoalsPage } from './pages/GoalsPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { RecurringPage } from './pages/RecurringPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { createModernInitialState, type ModernFinanceState } from './state/financeState';

const transactions = [
  { categoria: 'Mercado', status: 'Confirmado', tipo: 'Despesa', valor: 'R$ 120,00' },
  { categoria: 'Salario', status: 'Confirmado', tipo: 'Receita', valor: 'R$ 4.500,00' }
];

export function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [financeState, setFinanceState] = useState(createModernInitialState);
  const [preview, setPreview] = useState<'shell' | 'auth' | 'components'>('shell');

  function updateFinance<Key extends keyof ModernFinanceState>(key: Key, value: ModernFinanceState[Key]) {
    setFinanceState((current) => ({ ...current, [key]: value }));
  }

  if (preview === 'auth') {
    return (
      <div className="modern-app-shell">
        <div className="modern-preview-switch">
          <Button onClick={() => setPreview('shell')} variant="ghost">Ver shell</Button>
          <Button onClick={() => setPreview('components')} variant="ghost">Ver componentes</Button>
        </div>
        <AuthScreen />
      </div>
    );
  }

  if (preview === 'shell') {
    return (
      <AppShell
        activePage={activePage}
        onNavigate={setActivePage}
        userInitials="FC"
        userName="FinanCasa Modern"
      >
        {renderModernPage(activePage, financeState, updateFinance, setPreview)}
      </AppShell>
    );
  }

  return (
    <div className="modern-app-shell">
      <header className="modern-app-header">
        <div className="modern-app-title">
          <strong>FinanCasa Modern</strong>
          <span>Design system base para a migracao gradual em React + TypeScript.</span>
        </div>
        <div className="modern-preview-switch">
          <Badge tone="success">Base pronta</Badge>
          <Button onClick={() => setPreview('shell')} variant="ghost">Ver shell</Button>
          <Button onClick={() => setPreview('auth')} variant="ghost">Ver autenticação</Button>
        </div>
      </header>

      <div className="modern-preview-grid">
        <div className="modern-preview-stack">
          <Card
            title="Novo Lancamento"
            subtitle="Componentes padronizados para formularios financeiros."
            tone="expense"
            toolbar={<Badge tone="expense">Despesa</Badge>}
          >
            <div className="modern-preview-stack">
              <SegmentedControl
                options={[
                  { label: 'Despesa', value: 'despesa' },
                  { label: 'Receita', value: 'receita' }
                ]}
                value="despesa"
              />
              <Input label="Valor" placeholder="0,00" />
              <Select label="Categoria" value="">
                <option value="">Selecione uma categoria</option>
                <option value="mercado">Mercado</option>
              </Select>
              <Button variant="primary">Salvar Lancamento</Button>
            </div>
          </Card>

          <Card title="Transacoes" subtitle="Tabela responsiva preparada para filtros e acoes.">
            <Table
              columns={[
                { key: 'tipo', header: 'Tipo', render: (row) => <Badge tone={row.tipo === 'Receita' ? 'income' : 'expense'}>{row.tipo}</Badge> },
                { key: 'categoria', header: 'Categoria', render: (row) => row.categoria },
                { key: 'valor', header: 'Valor', render: (row) => row.valor },
                { key: 'status', header: 'Status', render: (row) => <Badge tone="success">{row.status}</Badge> }
              ]}
              rows={transactions}
            />
          </Card>
        </div>

        <div className="modern-preview-stack">
          <Card title="Estados" subtitle="Padroes para vazio, feedback e decisoes.">
            <EmptyState
              action={<Button variant="ghost">Cadastrar item</Button>}
              text="Use este bloco quando uma lista ainda nao tiver dados."
              title="Nenhum registro encontrado"
            />
          </Card>

          <Card title="Dialogo" subtitle="Modelo visual para confirmacoes e avisos.">
            <Dialog confirmLabel="Entendi" open={false} title="Lancamento salvo">
              <span className="fc-field__hint">Exemplo estatico do componente de dialogo.</span>
            </Dialog>
            <Button variant="primary">Abrir dialogo</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function renderModernPage(
  activePage: PageId,
  financeState: ModernFinanceState,
  updateFinance: <Key extends keyof ModernFinanceState>(key: Key, value: ModernFinanceState[Key]) => void,
  setPreview: (preview: 'shell' | 'auth' | 'components') => void
) {
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

  if (activePage === 'contas') {
    return (
      <AccountsPage
        accounts={financeState.contas}
        onChange={(contas) => updateFinance('contas', contas)}
        transactions={financeState.transacoes}
      />
    );
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
      title="Migração gradual"
      subtitle="As primeiras telas administrativas já estão em React."
      toolbar={<Button onClick={() => setPreview('auth')} variant="ghost">Ver autenticação</Button>}
    >
      <EmptyState
        action={<Button onClick={() => setPreview('components')} variant="primary">Ver componentes</Button>}
        text="Categorias, metas, contas, investimentos e recorrentes já podem ser testados neste shell moderno. As demais telas seguem preservadas no app legado até a etapa correspondente."
        title="Tela aguardando migração"
      />
    </Card>
  );
}
