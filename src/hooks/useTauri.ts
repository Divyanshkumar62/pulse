import { invoke } from '@tauri-apps/api/core';
import type { HttpResponse, Collection, HistoryEntry, Environment, Team, Invitation, TeamRole, RequestBody } from '../types';

export interface UserSettings {
  email: string;
  name: string;
  avatarUrl?: string;
  default_timeout_secs: number;
  follow_redirects: boolean;
  verify_ssl: boolean;
  theme: string;
}

export async function sendRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: RequestBody,
  settings: UserSettings
): Promise<HttpResponse> {
  return invoke('send_http_request', { method, url, headers, body, settings });
}

export async function loadCollection(path: string): Promise<Collection> {
  return invoke('load_collection', { path });
}

export async function loadCollections(): Promise<Collection[]> {
  return invoke('load_collections');
}

export async function createDataDir(): Promise<void> {
  return invoke('create_data_dir');
}

export async function saveCollection(collection: Collection, path: string): Promise<void> {
  return invoke('save_collection', { collection, path });
}

export async function loadEnvironments(): Promise<Environment[]> {
  return invoke('load_environments');
}

export async function saveEnvironments(environments: Environment[]): Promise<void> {
  return invoke('save_environments', { environments });
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return invoke('load_history');
}

export async function saveHistory(history: HistoryEntry[]): Promise<void> {
  return invoke('save_history', { history });
}

export async function importPostmanCollection(path: string): Promise<Collection> {
  return invoke('import_postman_collection', { path });
}

export async function getUserSettings(): Promise<UserSettings> {
  return invoke('get_user_settings');
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  return invoke('save_user_settings', { settings });
}

export async function createTeam(name: string, ownerEmail: string, ownerName: string): Promise<Team> {
  return invoke('create_team', { name, ownerEmail, ownerName });
}

export async function getTeams(): Promise<Team[]> {
  return invoke('get_teams');
}

export async function inviteToTeam(
  teamId: string,
  teamName: string,
  email: string,
  role: TeamRole,
  invitedBy: string,
  invitedByName: string
): Promise<Invitation> {
  return invoke('invite_to_team', { 
    teamId, 
    teamName, 
    email, 
    role, 
    invitedBy, 
    invitedByName 
  });
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  return invoke('get_pending_invitations');
}

export async function getAllInvitations(): Promise<Invitation[]> {
  return invoke('get_all_invitations');
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  return invoke('accept_invitation', { invitationId });
}

export async function declineInvitation(invitationId: string): Promise<void> {
  return invoke('decline_invitation', { invitationId });
}

export async function renameTeam(teamId: string, newName: string): Promise<void> {
  return invoke('rename_team', { teamId, newName });
}

export async function deleteTeam(teamId: string): Promise<void> {
  return invoke('delete_team', { teamId });
}

export async function pinTeam(teamId: string, pinned: boolean): Promise<void> {
  return invoke('pin_team', { teamId, pinned });
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  return invoke('remove_team_member', { teamId, userId });
}

export async function gitUpdatePresence(path: string, email: string, itemId: string): Promise<void> {
  return invoke('git_update_presence', { path, email, itemId });
}

export async function gitGetPresence(path: string): Promise<any[]> {
  return invoke('git_get_presence', { path });
}

export async function gitGetActivityLog(path: string): Promise<any[]> {
  return invoke('git_get_activity_log', { path });
}

export interface OAuthResult {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

export async function startOAuthFlow(
  authUrl: string,
  clientId: string,
  scopes: string
): Promise<OAuthResult> {
  return invoke('start_oauth_flow', { authUrl, clientId, scopes });
}

export async function exchangeOAuthToken(
  tokenUrl: string,
  code: string,
  codeVerifier: string,
  clientId: string,
  clientSecret: string | null,
  redirectUri: string
): Promise<string> {
  return invoke('exchange_oauth_token', { 
    tokenUrl, 
    code, 
    codeVerifier, 
    clientId, 
    clientSecret, 
    redirectUri 
  });
}

export async function exportCollection(collection: Collection, format: String): Promise<any> {
  return invoke('export_collection', { collection, format });
}

// Workspace Sync Commands
export async function deleteCollectionFromDisk(workspacePath: String, collectionId: string): Promise<void> {
  return invoke('delete_collection_from_disk', { workspacePath, collectionId });
}

export async function saveCollectionToDisk(workspacePath: string, collection: Collection): Promise<void> {
  return invoke('save_collection_to_disk', { workspacePath, collection });
}

export async function loadCollectionsFromWorkspace(workspacePath: string): Promise<Collection[]> {
  return invoke('load_collections_from_workspace', { workspacePath });
}

export async function saveWorkspaceToDisk(workspacePath: string, environments: Environment[]): Promise<void> {
  return invoke('save_workspace_to_disk', { workspacePath, environments });
}

// Git Commands
export interface GitStatus {
  branch: string;
  has_changes: boolean;
  untracked: string[];
  modified: string[];
  conflicted: string[];
  is_rebasing: boolean;
}

export async function gitInit(path: string): Promise<void> {
  return invoke('git_init_repo', { path });
}

export async function getGitStatus(path: string): Promise<GitStatus> {
  return invoke('get_git_status', { path });
}

export async function gitCommit(path: string, message: string): Promise<void> {
  return invoke('git_commit_changes', { path, message });
}

export async function gitPush(path: string): Promise<boolean> {
  return invoke('git_push_repo', { path });
}

export async function gitPull(path: string): Promise<void> {
  return invoke('git_pull_repo', { path });
}

export async function gitAddRemote(path: string, remoteName: string, remoteUrl: string): Promise<void> {
  return invoke('git_add_remote', { path, remoteName, remoteUrl });
}

export async function resolveGitConflict(path: string, filePath: string, resolution: 'ours' | 'theirs'): Promise<void> {
  return invoke('git_resolve_conflict', { path, filePath, resolution });
}

export async function gitRebaseContinue(path: string): Promise<void> {
  return invoke('git_rebase_continue', { path });
}

export async function gitRebaseAbort(path: string): Promise<void> {
  return invoke('git_rebase_abort', { path });
}

export async function saveFlowsToDisk(workspacePath: string, flows: any[]): Promise<void> {
  return invoke('save_flows_to_disk', { workspacePath, flows });
}

export async function loadFlowsFromWorkspace(workspacePath: string): Promise<any[]> {
  return invoke('load_flows_from_workspace', { workspacePath });
}
