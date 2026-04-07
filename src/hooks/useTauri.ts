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
  return invoke('create_team', { name, owner_email: ownerEmail, owner_name: ownerName });
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
    team_id: teamId, 
    team_name: teamName, 
    email, 
    role, 
    invited_by: invitedBy, 
    invited_by_name: invitedByName 
  });
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  return invoke('get_pending_invitations');
}

export async function getAllInvitations(): Promise<Invitation[]> {
  return invoke('get_all_invitations');
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  return invoke('accept_invitation', { invitation_id: invitationId });
}

export async function declineInvitation(invitationId: string): Promise<void> {
  return invoke('decline_invitation', { invitation_id: invitationId });
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
