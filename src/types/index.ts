export interface KeyValuePair {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export type Header = KeyValuePair;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'WS';

export interface GraphQLConfig {
  query: string;
  variables: string;
}

export interface RequestBody {
  type: 'none' | 'raw' | 'form-data' | 'json' | 'graphql';
  content: string;
  graphql?: GraphQLConfig;
}

export interface OAuth2Config {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'oauth2';
  config?: any; // To be expanded in OAuth implementation
}

export type Protocol = 'http' | 'ws';

export interface WebSocketMessage {
  id: string;
  type: 'send' | 'receive' | 'error' | 'meta';
  content: string;
  timestamp: string;
}

export type WebSocketStatus = 'none' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface HttpResponse {
  status: number;
  status_text: string;
  headers: Header[];
  body: string;
  time_ms: number;
}

export interface Variable {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
}

export interface Request {
  id: string;
  name: string;
  method: HttpMethod;
  protocol?: Protocol;
  url: string;
  params?: KeyValuePair[];
  headers: Header[];
  body: RequestBody;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers: Header[];
  body: RequestBody;
  preRequestScript?: string;
}

export interface Folder {
  id: string;
  name: string;
  requests: Request[];
  folders?: Folder[];
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  requests: Request[];
  folders: Folder[];
  variables: KeyValuePair[];
}

export interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string; enabled: boolean }[];
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  method: HttpMethod;
  url: string;
  status: number;
  time_ms: number;
  request: HttpRequest;
  response: HttpResponse;
}

export interface TeamMember {
  user_id: string;
  email: string;
  name: string;
  role: TeamRole;
  joined_at: string;
}

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  members: TeamMember[];
  created_at: string;
}

export interface Invitation {
  id: string;
  team_id: string;
  team_name: string;
  email: string;
  role: TeamRole;
  status: InvitationStatus;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';
