import { useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getUserInitials, getUserName } from '../services/supabaseClient';
import type { FinanceWorkspace, WorkspaceMember, WorkspaceRole } from '../services/financePersistence';
import { Badge, Button, Card, Dialog, EmptyState, Input, Select } from '../components';

interface UsersAccessPageProps {
  canManage: boolean;
  loading?: boolean;
  members: WorkspaceMember[];
  onAddMember: (email: string, role: WorkspaceRole) => Promise<void>;
  onChangeRole: (userId: string, role: WorkspaceRole) => Promise<void>;
  onReload: () => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onSignOut: () => void;
  onUpdateProfile: (name: string) => Promise<void>;
  user: User | null;
  workspace: FinanceWorkspace | null;
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Administrador';
  if (role === 'viewer') return 'Visualizador';
  return 'Editor';
}

function roleTone(role: string) {
  if (role === 'admin') return 'success';
  if (role === 'viewer') return 'warning';
  return 'income';
}

export function UsersAccessPage({
  canManage,
  loading,
  members,
  onAddMember,
  onChangeRole,
  onReload,
  onRemoveMember,
  onSignOut,
  onUpdateProfile,
  user,
  workspace
}: UsersAccessPageProps) {
  const [profileName, setProfileName] = useState(getUserName(user));
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<WorkspaceRole>('editor');
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const sortedMembers = useMemo(() => members.slice().sort((a, b) => a.name.localeCompare(b.name)), [members]);

  useEffect(() => {
    setProfileName(getUserName(user));
  }, [user]);

  async function runAction(action: () => Promise<void>, success: string) {
    try {
      await action();
      setMessage({ title: 'Tudo certo', text: success });
    } catch (error) {
      setMessage({ title: 'Não foi possível concluir', text: error instanceof Error ? error.message : 'Tente novamente.' });
    }
  }

  async function saveProfile() {
    const name = profileName.trim();
    if (!name) {
      setMessage({ title: 'Nome obrigatório', text: 'Informe um nome para o perfil.' });
      return;
    }
    await runAction(() => onUpdateProfile(name), 'Perfil atualizado com sucesso.');
  }

  async function addMember() {
    const email = memberEmail.trim().toLowerCase();
    if (!email) {
      setMessage({ title: 'E-mail obrigatório', text: 'Informe o e-mail do usuário.' });
      return;
    }
    await runAction(async () => {
      await onAddMember(email, memberRole);
      setMemberEmail('');
      setMemberRole('editor');
    }, 'Usuário adicionado à área financeira.');
  }

  return (
    <>
      <div className="modern-users-page">
        <div className="modern-page-grid">
          <Card
            title="Informações do perfil"
            subtitle={workspace?.name || 'Área financeira'}
            toolbar={<Badge tone={canManage ? 'success' : 'warning'}>{canManage ? 'Administrador' : 'Convidado'}</Badge>}
          >
            <div className="modern-profile-summary">
              <div className="modern-avatar">{getUserInitials(user)}</div>
              <div>
                <strong>{getUserName(user)}</strong>
                <span>{user?.email || 'Sem e-mail'}</span>
              </div>
            </div>
            <div className="modern-preview-stack">
              <Input label="Nome exibido" onChange={(event) => setProfileName(event.target.value)} value={profileName} />
              <Input disabled label="E-mail de acesso" value={user?.email || ''} />
              <div className="modern-form-actions modern-form-actions--spread">
                <Button onClick={onSignOut}>Sair</Button>
                <Button disabled={loading} onClick={saveProfile} variant="primary">Salvar perfil</Button>
              </div>
            </div>
          </Card>

          <Card title="Adicionar usuário" subtitle="A pessoa precisa criar login antes de ser adicionada.">
            <div className="modern-preview-stack">
              <Input disabled={!canManage || loading} label="E-mail do usuário" onChange={(event) => setMemberEmail(event.target.value)} placeholder="pessoa@email.com" type="email" value={memberEmail} />
              <Select disabled={!canManage || loading} label="Permissão" onChange={(event) => setMemberRole(event.target.value as WorkspaceRole)} value={memberRole}>
                <option value="editor">Editor</option>
                <option value="viewer">Visualizador</option>
                <option value="admin">Administrador</option>
              </Select>
              <Button disabled={!canManage || loading} onClick={addMember} variant="primary">Adicionar na área</Button>
            </div>
          </Card>
        </div>

        <Card
          title="Usuários com acesso"
          subtitle={workspace ? 'Dados compartilhados na mesma área financeira.' : 'Área online ainda não carregada.'}
          toolbar={<Button disabled={loading} onClick={() => runAction(onReload, 'Lista de usuários atualizada.')} variant="ghost">Atualizar</Button>}
        >
          <div className="modern-list">
            {sortedMembers.map((member) => {
              const isMe = member.user_id === user?.id;
              const locked = !canManage || isMe;
              return (
                <div className="modern-list-row modern-member-row" key={member.user_id}>
                  <div>
                    <div className="modern-row-title">{member.name}{isMe ? ' · você' : ''}</div>
                    <div className="modern-row-subtitle">{member.email || 'Sem e-mail cadastrado'}</div>
                  </div>
                  <div className="modern-row-actions">
                    <Badge tone={roleTone(member.role)}>{roleLabel(member.role)}</Badge>
                    <Select
                      disabled={locked || loading}
                      label="Permissão"
                      onChange={(event) => runAction(() => onChangeRole(member.user_id, event.target.value as WorkspaceRole), 'Permissão atualizada.')}
                      value={member.role}
                    >
                      <option value="admin">Administrador</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Visualizador</option>
                    </Select>
                    <Button disabled={locked || loading} onClick={() => setRemoving(member)} variant="danger">Remover</Button>
                  </div>
                </div>
              );
            })}
            {!sortedMembers.length && <EmptyState title="Nenhum usuário cadastrado" text="Usuários autorizados aparecerão aqui." />}
          </div>
        </Card>
      </div>

      <Dialog confirmLabel="OK" onConfirm={() => setMessage(null)} open={!!message} title={message?.title || ''}>
        <span className="fc-field__hint">{message?.text}</span>
      </Dialog>

      <Dialog
        confirmLabel="Remover"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const member = removing;
          setRemoving(null);
          if (member) void runAction(() => onRemoveMember(member.user_id), 'Usuário removido da área financeira.');
        }}
        open={!!removing}
        title="Remover acesso"
      >
        <span className="fc-field__hint">Remover o acesso de {removing?.name || 'usuário'}?</span>
      </Dialog>
    </>
  );
}
