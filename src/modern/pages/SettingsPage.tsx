import { useEffect, useState, type ChangeEvent } from 'react';
import { getFinanCasaConfig } from '../config';
import type { FinanceWorkspace } from '../services/financePersistence';
import type { ModernFinanceState } from '../state/financeState';
import { Badge, Button, Card, Dialog, Input } from '../components';

interface SettingsPageProps {
  canEdit: boolean;
  financeState: ModernFinanceState;
  onReplaceState: (state: ModernFinanceState) => void;
  onRenameWorkspace: (name: string) => Promise<void>;
  remoteStatus: string;
  workspace: FinanceWorkspace | null;
}

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage({ canEdit, financeState, onReplaceState, onRenameWorkspace, remoteStatus, workspace }: SettingsPageProps) {
  const config = getFinanCasaConfig();
  const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    setWorkspaceName(workspace?.name || '');
  }, [workspace?.name]);

  async function saveWorkspaceName() {
    const name = workspaceName.trim();
    if (!name) {
      setMessage({ title: 'Nome obrigatório', text: 'Informe um nome para a área financeira.' });
      return;
    }
    try {
      await onRenameWorkspace(name);
      setMessage({ title: 'Configuração salva', text: 'Nome da área financeira atualizado.' });
    } catch (error) {
      setMessage({ title: 'Não foi possível salvar', text: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!canEdit) {
      setMessage({ title: 'Somente leitura', text: 'Seu acesso atual não permite importar dados.' });
      return;
    }
    try {
      const text = await file.text();
      onReplaceState(JSON.parse(text) as ModernFinanceState);
      setMessage({ title: 'Dados importados', text: 'O estado importado será sincronizado com o Supabase.' });
    } catch {
      setMessage({ title: 'Arquivo inválido', text: 'Selecione um JSON válido do FinanCasa.' });
    }
  }

  return (
    <>
      <div className="modern-page-grid">
        <Card title="Área financeira" subtitle="Nome, status remoto e modo de edição">
          <div className="modern-preview-stack">
            <Input disabled={!canEdit} label="Nome da área" onChange={(event) => setWorkspaceName(event.target.value)} value={workspaceName} />
            <div className="modern-setting-row">
              <span>Status de sincronização</span>
              <Badge tone={remoteStatus.includes('salvo') || remoteStatus.includes('carregado') ? 'success' : 'warning'}>{remoteStatus}</Badge>
            </div>
            <div className="modern-setting-row">
              <span>Permissão atual</span>
              <Badge tone={canEdit ? 'success' : 'warning'}>{canEdit ? 'Pode editar' : 'Somente leitura'}</Badge>
            </div>
            <Button disabled={!canEdit} onClick={saveWorkspaceName} variant="primary">Salvar configurações</Button>
          </div>
        </Card>

        <Card title="Backup e restauração" subtitle="Exportação manual do estado atual">
          <div className="modern-preview-stack">
            <Button onClick={() => downloadJson('financasa-backup.json', financeState)} variant="primary">Exportar JSON</Button>
            <label aria-disabled={!canEdit} className={['fc-button', !canEdit ? 'is-disabled' : ''].filter(Boolean).join(' ')}>
              Importar JSON
              <input accept="application/json" disabled={!canEdit} hidden onChange={importJson} type="file" />
            </label>
            <span className="fc-field__hint">A importação substitui o estado moderno atual e dispara sincronização remota.</span>
          </div>
        </Card>

        <Card title="Supabase" subtitle="Configuração carregada no navegador">
          <div className="modern-list">
            <div className="modern-setting-row"><span>URL</span><strong>{config.SUPABASE_URL}</strong></div>
            <div className="modern-setting-row"><span>Chave pública</span><strong>{config.SUPABASE_PUBLISHABLE_KEY.slice(0, 18)}...</strong></div>
            <div className="modern-setting-row"><span>Workspace</span><strong>{workspace?.id || 'Não carregado'}</strong></div>
          </div>
        </Card>
      </div>

      <Dialog confirmLabel="OK" onConfirm={() => setMessage(null)} open={!!message} title={message?.title || ''}>
        <span className="fc-field__hint">{message?.text}</span>
      </Dialog>
    </>
  );
}
