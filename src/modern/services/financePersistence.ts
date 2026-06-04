import type { User } from '@supabase/supabase-js';
import { getUserName, getBrowserSupabaseClient } from './supabaseClient';
import { createModernInitialState, hydrateModernFinanceState, type ModernFinanceState } from '../state/financeState';

export const SYSTEM_ADMIN_EMAILS = ['david@financasa.com.br'];

export type WorkspaceRole = 'admin' | 'editor' | 'viewer';

export interface FinanceWorkspace {
  created_at?: string;
  id: string;
  name: string;
  owner_id: string;
  updated_at?: string;
}

export interface WorkspaceMember {
  created_at?: string;
  email: string;
  name: string;
  role: WorkspaceRole;
  user_id: string;
}

export interface RemoteWorkspaceBundle {
  financeState: ModernFinanceState;
  members: WorkspaceMember[];
  workspace: FinanceWorkspace;
}

interface ProfileRow {
  email?: string;
  id?: string;
  name?: string;
}

interface WorkspaceMemberRow {
  created_at?: string;
  financasa_profiles?: ProfileRow | ProfileRow[];
  role?: WorkspaceRole;
  user_id?: string;
}

interface WorkspaceRow extends FinanceWorkspace {
  state?: Partial<ModernFinanceState> | null;
}

export function isSystemAdmin(user?: User | null) {
  const email = String(user?.email || '').trim().toLowerCase();
  return SYSTEM_ADMIN_EMAILS.includes(email);
}

export function isMissingWorkspaceSchema(error: unknown) {
  const typed = error as { code?: string; message?: string } | null;
  const msg = String(typed?.message || '').toLowerCase();
  return typed?.code === '42P01'
    || msg.includes('financasa_workspaces')
    || msg.includes('financasa_profiles')
    || msg.includes('financasa_workspace_members');
}

export function normalizeMembers(rows: WorkspaceMemberRow[], user?: User | null, workspace?: FinanceWorkspace | null): WorkspaceMember[] {
  const members = rows.map((row) => {
    const profile = Array.isArray(row.financasa_profiles) ? row.financasa_profiles[0] : row.financasa_profiles;
    const email = profile?.email || '';
    const admin = SYSTEM_ADMIN_EMAILS.includes(email.toLowerCase());
    return {
      created_at: row.created_at,
      email,
      name: profile?.name || email || 'Usuário',
      role: admin ? 'admin' : row.role || 'editor',
      user_id: String(row.user_id || profile?.id || '')
    };
  }).filter((member) => member.user_id);

  if (user && !members.some((member) => member.user_id === user.id)) {
    members.unshift({
      created_at: undefined,
      email: user.email || '',
      name: getUserName(user),
      role: workspace?.owner_id === user.id || isSystemAdmin(user) ? 'admin' : 'editor',
      user_id: user.id
    });
  }

  return members;
}

export function getCurrentMemberRole(members: WorkspaceMember[], user?: User | null) {
  if (isSystemAdmin(user)) return 'admin';
  return members.find((member) => member.user_id === user?.id)?.role || '';
}

export function canManageWorkspaceUsers(user: User | null, workspace: FinanceWorkspace | null, members: WorkspaceMember[]) {
  return !!user && !!workspace && (isSystemAdmin(user) || workspace.owner_id === user.id || getCurrentMemberRole(members, user) === 'admin');
}

export function canEditWorkspace(user: User | null, workspace: FinanceWorkspace | null, members: WorkspaceMember[]) {
  if (!user || !workspace) return false;
  if (isSystemAdmin(user) || workspace.owner_id === user.id) return true;
  const role = getCurrentMemberRole(members, user);
  return role === 'admin' || role === 'editor';
}

export async function getCurrentUser() {
  const { data, error } = await getBrowserSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session?.user || null;
}

export async function ensureProfile(user: User) {
  const client = getBrowserSupabaseClient();
  const email = String(user.email || '').toLowerCase();
  const name = getUserName(user);
  const { error } = await client.from('financasa_profiles').upsert(
    { id: user.id, email, name, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function loadWorkspaceMembers(workspaceId: string, user?: User | null, workspace?: FinanceWorkspace | null) {
  const { data, error } = await getBrowserSupabaseClient()
    .from('financasa_workspace_members')
    .select('user_id,role,created_at,financasa_profiles(id,email,name)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return normalizeMembers((data || []) as WorkspaceMemberRow[], user, workspace);
}

export async function ensureSystemAdminMembership(workspaceId: string, user: User) {
  if (!isSystemAdmin(user)) return;
  const { error } = await getBrowserSupabaseClient().from('financasa_workspace_members').upsert(
    { workspace_id: workspaceId, user_id: user.id, role: 'admin' },
    { onConflict: 'workspace_id,user_id' }
  );
  if (error) console.warn('Não foi possível sincronizar administrador do sistema:', error.message);
}

export async function loadRemoteWorkspace(user: User): Promise<RemoteWorkspaceBundle> {
  await ensureProfile(user);

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .from('financasa_workspaces')
    .select('id,owner_id,name,state,created_at,updated_at')
    .order('created_at', { ascending: true });

  if (error) throw error;

  const workspaces = (data || []) as WorkspaceRow[];
  const ownedWorkspace = workspaces.find((workspace) => workspace.owner_id === user.id);
  const sharedWorkspace = workspaces.find((workspace) => workspace.owner_id !== user.id);
  let workspace = ownedWorkspace || (isSystemAdmin(user) ? null : sharedWorkspace);

  if (!workspace) {
    const initial = createModernInitialState();
    const created = await client
      .from('financasa_workspaces')
      .insert({ owner_id: user.id, name: `Finanças de ${getUserName(user)}`, state: initial })
      .select('id,owner_id,name,state,created_at,updated_at')
      .single();

    if (created.error) throw created.error;
    workspace = created.data as WorkspaceRow;

    const member = await client.from('financasa_workspace_members').upsert(
      { workspace_id: workspace.id, user_id: user.id, role: 'admin' },
      { onConflict: 'workspace_id,user_id' }
    );
    if (member.error) throw member.error;
  }

  await ensureSystemAdminMembership(workspace.id, user);
  const members = await loadWorkspaceMembers(workspace.id, user, workspace);

  return {
    financeState: hydrateModernFinanceState(workspace.state),
    members,
    workspace
  };
}

export async function saveRemoteFinanceState(workspaceId: string, financeState: ModernFinanceState) {
  const { error } = await getBrowserSupabaseClient()
    .from('financasa_workspaces')
    .update({ state: financeState, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);

  if (error) throw error;
}

export async function updateRemoteProfileName(user: User, name: string) {
  const client = getBrowserSupabaseClient();
  const { error: authError } = await client.auth.updateUser({ data: { name } });
  if (authError) throw authError;

  const { error } = await client.from('financasa_profiles').upsert(
    { id: user.id, email: String(user.email || '').toLowerCase(), name, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

export async function updateRemoteWorkspaceName(workspaceId: string, name: string) {
  const { error } = await getBrowserSupabaseClient()
    .from('financasa_workspaces')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', workspaceId);
  if (error) throw error;
}

export async function addWorkspaceUserByEmail(workspaceId: string, email: string, role: WorkspaceRole) {
  const client = getBrowserSupabaseClient();
  const profile = await client
    .from('financasa_profiles')
    .select('id,email,name')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (profile.error) throw profile.error;
  if (!profile.data) throw new Error('Usuário não encontrado. Peça para ele criar conta primeiro.');

  const { error } = await client.from('financasa_workspace_members').upsert(
    { workspace_id: workspaceId, user_id: profile.data.id, role },
    { onConflict: 'workspace_id,user_id' }
  );
  if (error) throw error;
}

export async function changeWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole) {
  const { error } = await getBrowserSupabaseClient()
    .from('financasa_workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function removeWorkspaceMember(workspaceId: string, userId: string) {
  const { error } = await getBrowserSupabaseClient()
    .from('financasa_workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function testSupabaseConnection() {
  const { error } = await getBrowserSupabaseClient().from('financasa_workspaces').select('id').limit(1);
  if (error) throw error;
  return true;
}
