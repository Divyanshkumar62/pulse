export interface KeyValuePair {
  key: string;
  value: string;
  enabled?: boolean;
  description?: string;
  secret?: boolean;
}

export type Header = KeyValuePair;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'WS';
export type Protocol = 'http' | 'ws';

export interface GraphQLConfig {
  query: string;
  variables: string;
}

export interface RequestBody {
  type: 'none' | 'json' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql';
  content: string;
  graphql?: GraphQLConfig;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'oauth2' | 'inherit' | 'apiKey' | 'digest' | 'awsSigV4' | 'jwt';

export interface AuthConfig {
  type: AuthType;
  config?: any;
}

/** Per-request proxy override; when enabled, `url` beats the global settings proxy. */
export interface ProxyOverride {
  enabled: boolean;
  url?: string;
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
  responseSchema?: string;
  pinned?: boolean;
  showDocs?: boolean;
  description?: string;
  collectionId?: string;
  /** Enable the shared cookie jar for this request's session. */
  useCookies?: boolean;
  /** Override the global proxy for this request only. */
  proxyOverride?: ProxyOverride;
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
  pinned?: boolean;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string | null;
  requests: Request[];
  folders: Folder[];
  variables: KeyValuePair[];
  pinned?: boolean;
  auth?: AuthConfig;
  preRequestScript?: string;
  testScript?: string;
}

export interface Environment {
  id: string;
  name: string;
  variables: Variable[];
  pinned?: boolean;
}

export interface Variable extends KeyValuePair {
  id?: string;
}

export interface HistoryEntry {
  id: string;
  requestId?: string;
  requestName?: string;
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
}

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  members: TeamMember[];
  pinned?: boolean;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

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
  accepted_at?: string;
}

export interface HttpResponse {
  status: number;
  status_text: string;
  headers: KeyValuePair[];
  body: string;
  time_ms: number;
  /** Set when an auth flow produced a fresh token during this request. */
  auth_refresh?: string;
}

export interface SessionCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
}

export interface WebSocketMessage {
  id: string;
  type: 'send' | 'received' | 'error' | 'meta';
  content: string;
  timestamp: string;
}

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface FlowNodeMapping {
  sourcePath: string;
  targetVar: string;
}

export interface FlowNode {
  id: string;
  type: 'request' | 'logic' | 'delay' | 'start' | 'end' | 'loop' | 'assertion';
  position: { x: number; y: number };
  data: {
    name: string;
    requestId?: string;
    url?: string;
    method?: string;
    delayMs?: number;
    condition?: string;
    loopOver?: string; // e.g. "{{users}}"
    loopVar?: string;  // e.g. "user"
    headers?: { id: string; key: string; value: string; enabled: boolean }[];
    params?: { id: string; key: string; value: string; enabled: boolean }[];
    mappings?: FlowNodeMapping[];
    body?: string;
    status?: 'idle' | 'running' | 'success' | 'error';
    lastResponse?: HttpResponse;
    triggeredHandle?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
}

export interface Flow {
  id: string;
  name: string;
  description?: string;
  environmentId?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  workspaceId: string;
  createdAt?: number;
  updatedAt?: number;
  pinned?: boolean;
}

export interface MockRoute {
  id: string;
  name?: string;
  path: string;
  method: string;
  statusCode: number;
  responseBody: string;
  headers: KeyValuePair[];
  delayMs?: number;
}

export interface MockServer {
  id: string;
  name: string;
  port: number;
  routes: MockRoute[];
  status: 'active' | 'inactive';
  publicUrl?: string;
  isTunneling?: boolean;
  tunnelStatus?: string;
}

export interface StreamFrame {
  id: string;
  connectionId: string;
  protocol: 'WS' | 'SSE' | 'gRPC';
  direction: 'IN' | 'OUT';
  timestamp: string;
  sizeBytes: number;
  payloadData: string;
}

export interface StreamStatus {
  connectionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
}
