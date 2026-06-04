import { useState } from 'react';
import { getFinanCasaConfig } from '../config';
import { testSupabaseConnection } from '../services/financePersistence';
import type { ModernFinanceState } from '../state/financeState';
import { Badge, Button, Card, Dialog } from '../components';
import { getTransactionDate, getTransactionDescription } from '../../domain/transactions';

interface IntegrationsPageProps {
  financeState: ModernFinanceState;
  remoteStatus: string;
}

function exportTransactionsCsv(financeState: ModernFinanceState) {
  const rows = [
    ['Data', 'Status', 'Tipo', 'Descrição', 'Categoria', 'Conta', 'Tags', 'Valor'],
    ...financeState.transacoes.map((tx) => [
      getTransactionDate(tx),
      tx.status || '',
      tx.tipo || '',
      getTransactionDescription(tx),
      tx.categoria || '',
      String(tx.conta_id || tx.conta || ''),
      tx.tags || '',
      String(tx.valor || '')
    ])
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'financasa_transacoes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function IntegrationsPage({ financeState, remoteStatus }: IntegrationsPageProps) {
  const config = getFinanCasaConfig();
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);

  async function testConnection() {
    try {
      await testSupabaseConnection();
      setMessage({ title: 'Conexão ativa', text: 'O Supabase respondeu corretamente.' });
    } catch (error) {
      setMessage({ title: 'Falha na conexão', text: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  return (
    <>
      <div className="modern-page-grid">
        <Card
          title="Supabase"
          subtitle="Autenticação, workspace compartilhado e sincronização remota"
          toolbar={<Badge tone="success">Principal</Badge>}
        >
          <div className="modern-integration-stack">
            <div className="modern-integration-row">
              <div><strong>Projeto</strong><span>{config.SUPABASE_URL}</span></div>
              <Badge tone={remoteStatus.includes('erro') ? 'danger' : 'success'}>{remoteStatus}</Badge>
            </div>
            <div className="modern-integration-row">
              <div><strong>Tabelas usadas</strong><span>profiles, workspaces e workspace_members</span></div>
              <Badge tone="income">JSON state</Badge>
            </div>
            <Button onClick={testConnection} variant="primary">Testar conexão</Button>
          </div>
        </Card>

        <Card title="Exportação CSV" subtitle="Integração manual com planilhas">
          <div className="modern-integration-stack">
            <div className="modern-integration-row">
              <div><strong>Transações</strong><span>{financeState.transacoes.length} lançamento(s) disponíveis</span></div>
              <Badge tone="warning">CSV</Badge>
            </div>
            <Button onClick={() => {
              exportTransactionsCsv(financeState);
              setMessage({ title: 'CSV gerado', text: 'O arquivo de transações foi exportado.' });
            }}>Exportar transações</Button>
          </div>
        </Card>

        <Card title="Próximas integrações" subtitle="Estrutura preparada para novas conexões">
          <div className="modern-list">
            <div className="modern-integration-row"><div><strong>Bancos via Open Finance</strong><span>Preparado para conector futuro.</span></div><Badge tone="warning">Planejado</Badge></div>
            <div className="modern-integration-row"><div><strong>Planilhas</strong><span>Exportação atual por CSV e JSON.</span></div><Badge tone="income">Disponível</Badge></div>
            <div className="modern-integration-row"><div><strong>Auditoria</strong><span>Schema já possui tabela audit_logs.</span></div><Badge tone="warning">Parcial</Badge></div>
          </div>
        </Card>
      </div>

      <Dialog confirmLabel="OK" onConfirm={() => setMessage(null)} open={!!message} title={message?.title || ''}>
        <span className="fc-field__hint">{message?.text}</span>
      </Dialog>
    </>
  );
}
