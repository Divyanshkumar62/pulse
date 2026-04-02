import { invoke } from '@tauri-apps/api/core';
import type { HttpResponse, Collection, HistoryEntry, Environment, Team, Invitation, TeamRole, RequestBody } from '../types';
import { logger } from '../lib/logger';
export interface UserSettings {
  email: string;
  name: string;
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
  logger.tauri('createTeam', { name, ownerEmail, ownerName });
  try {
    const result = await invoke<Team>('create_team', { name, ownerEmail, ownerName });
    logger.tauri('createTeam', result, 'OK');
    return result;
  } catch (error: any) {
    logger.tauri('createTeam', error, 'ERR');
    throw error;
  }
}

export async function getTeams(): Promise<Team[]> {
  logger.tauri('getTeams');
  try {
    const result = await invoke<Team[]>('get_teams');
    logger.tauri('getTeams', { items: result.length }, 'OK');
    return result;
  } catch (error: any) {
    logger.tauri('getTeams', error, 'ERR');
    throw error;
  }
}

export async function inviteToTeam(
  teamId: string,
  teamName: string,
  email: string,
  role: TeamRole,
  invitedBy: string,
  invitedByName: string
): Promise<Invitation> {
  logger.tauri('inviteToTeam', { teamId, email, role });
  try {
    const result = await invoke<Invitation>('invite_to_team', { 
      teamId, 
      teamName, 
      email, 
      role, 
      invitedBy, 
      invitedByName 
    });
    logger.tauri('inviteToTeam', result, 'OK');
    return result;
  } catch (error: any) {
    logger.tauri('inviteToTeam', error, 'ERR');
    throw error;
  }
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  return invoke('get_pending_invitations');
}

export async function getAllInvitations(): Promise<Invitation[]> {
  return invoke('get_all_invitations');
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  logger.tauri('acceptInvitation', { invitationId });
  try {
    await invoke('accept_invitation', { invitationId });
    logger.tauri('acceptInvitation', null, 'OK');
  } catch (error: any) {
    logger.tauri('acceptInvitation', error, 'ERR');
    throw error;
  }
}

export async function declineInvitation(invitationId: string): Promise<void> {
  logger.tauri('declineInvitation', { invitationId });
  try {
    await invoke('decline_invitation', { invitationId });
    logger.tauri('declineInvitation', null, 'OK');
  } catch (error: any) {
    logger.tauri('declineInvitation', error, 'ERR');
    throw error;
  }
}

export async function resendInvitation(invitationId: string): Promise<void> {
    logger.tauri('resendInvitation', { invitationId });
    try {
        await invoke('resend_invitation', { invitationId });
        logger.tauri('resendInvitation', null, 'OK');
    } catch(error: any) {
        logger.tauri('resendInvitation', error, 'ERR');
        throw error;
    }
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

export async function exportCollection(collection: Collection, format: string): Promise<any> {
  return invoke('export_collection', { collection, format });
}

export interface ScriptExecutionResult {
  environment: Record<string, string>;
  collection: Record<string, string>;
  logs: string[];
  tests: { name: string; passed: boolean; message?: string }[];
}

export async function executeScript(
  script: string,
  context: {
    environment: Record<string, string>;
    collection: Record<string, string>;
    request: { url: string; method: string; headers: Record<string, string> };
    response?: { status: number; body: string; headers: Record<string, string> };
  }
): Promise<ScriptExecutionResult> {
  return invoke('execute_script', { script, context });
}
