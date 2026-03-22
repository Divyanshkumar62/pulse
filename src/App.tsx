import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  sendRequest, 
  importPostmanCollection,
  createTeam,
  getTeams,
  inviteToTeam,
  getAllInvitations,
  acceptInvitation,
  declineInvitation,
  loadEnvironments,
  saveEnvironments,
  loadHistory,
  saveHistory,
  getUserSettings,
  saveUserSettings,
  UserSettings,
} from './hooks/useTauri';
import type { HttpMethod, Header, HttpResponse, Collection, Request, Environment, HistoryEntry, Team, Invitation, TeamRole } from './types';
import TeamPanel from './components/TeamPanel';

const generateId = () => crypto.randomUUID?.() || Math.random().toString(36).substring(2, 15);

const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString();

const HeaderRow = memo(({ index, header, onChange, onDelete }: { 
  index: number;
  header: Header; 
  onChange: (index: number, field: 'key' | 'value', value: string) => void;
  onDelete: () => void;
}) => (
  <div className="header-row">
    <input
      type="text"
      placeholder="Header name"
      value={header.key}
      onChange={(e) => onChange(index, 'key', e.target.value)}
    />
    <input
      type="text"
      placeholder="Value"
      value={header.value}
      onChange={(e) => onChange(index, 'value', e.target.value)}
    />
    <button className="delete-btn" onClick={onDelete}>×</button>
  </div>
));

const StatusBadge = memo(({ status }: { status: number }) => {
  const className = status >= 200 && status < 300 ? 'status-success' 
    : status >= 300 && status < 400 ? 'status-redirect' 
    : 'status-error';
  return <span className={`status-badge ${className}`}>{status}</span>;
});

export default function App() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  const [activeRequest, setActiveRequest] = useState<Request | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'collections' | 'history' | 'environments' | 'teams' | 'settings'>('collections');
  
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Header[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<HttpResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState('1');
  
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  const [settings, setSettings] = useState<UserSettings | null>(null);
  
  const [configTab, setConfigTab] = useState<'headers' | 'body'>('headers');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (environments.length > 0) {
      saveEnvironments(environments).catch(console.error);
    }
  }, [environments]);

  useEffect(() => {
    if (history.length > 0) {
      saveHistory(history).catch(console.error);
    }
  }, [history]);

  useEffect(() => {
    if (settings) {
      saveUserSettings(settings).catch(console.error);
    }
  }, [settings]);

  const loadInitialData = async () => {
    try {
      const [envs, hist, loadedTeams, loadedInvitations, loadedSettings] = await Promise.all([
        loadEnvironments(),
        loadHistory(),
        getTeams(),
        getAllInvitations(),
        getUserSettings(),
      ]);
      setEnvironments(envs);
      setHistory(hist);
      setTeams(loadedTeams);
      setInvitations(loadedInvitations);
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setEnvironments([
        { id: '1', name: 'No Environment', variables: [] },
        { id: '2', name: 'Development', variables: [{ key: 'base_url', value: 'http://localhost:3000', enabled: true }] },
      ]);
      setSettings({ email: 'user@example.com', name: 'User', default_timeout_secs: 30, follow_redirects: true, verify_ssl: true });
    }
  };

  const activeEnv = useMemo(() => environments.find(e => e.id === activeEnvId), [environments, activeEnvId]);

  const replaceVariables = useCallback((text: string): string => {
    if (!activeEnv) return text;
    let result = text;
    for (const v of activeEnv.variables) {
      if (v.enabled) {
        result = result.replaceAll(`{{${v.key}}}`, v.value);
      }
    }
    return result;
  }, [activeEnv]);

  const handleSend = useCallback(async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    try {
      const processedUrl = replaceVariables(url);
      const processedBody = body ? replaceVariables(body) : null;
      const processedHeaders: Record<string, string> = {};
      
      for (const h of headers) {
        if (h.key && h.value) {
          processedHeaders[replaceVariables(h.key)] = replaceVariables(h.value);
        }
      }

      const res = await sendRequest(method, processedUrl, processedHeaders, processedBody);
      setResponse(res);
      
      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        method,
        url: processedUrl,
        status: res.status,
        time_ms: res.time_ms,
        request: { method, url: processedUrl, headers, body: processedBody },
        response: res,
      };
      setHistory(prev => [entry, ...prev.slice(0, 99)]);
    } catch (error) {
      setResponse({
        status: 0,
        status_text: 'Error',
        headers: [],
        body: String(error),
        time_ms: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [url, method, headers, body, replaceVariables]);

  const handleImportPostman = useCallback(async () => {
    const file = await open({ filters: [{ name: 'JSON', extensions: ['json'] }] });
    if (file) {
      try {
        const collection = await importPostmanCollection(file);
        setCollections(prev => [...prev, collection]);
        setActiveCollection(collection);
      } catch (error) {
        console.error('Import failed:', error);
      }
    }
  }, []);

  const handleNewCollection = useCallback(() => {
    const col: Collection = {
      id: generateId(),
      name: newCollectionName || 'New Collection',
      description: null,
      requests: [],
      folders: [],
    };
    setCollections(prev => [...prev, col]);
    setActiveCollection(col);
    setShowSaveModal(false);
    setNewCollectionName('');
  }, [newCollectionName]);

  const handleNewRequest = useCallback(() => {
    const req: Request = {
      id: generateId(),
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [{ key: 'Content-Type', value: 'application/json' }],
      body: null,
    };
    if (activeCollection) {
      const updated = { ...activeCollection, requests: [...activeCollection.requests, req] };
      setActiveCollection(updated);
      setCollections(prev => prev.map(c => c.id === updated.id ? updated : c));
      setActiveRequest(req);
    }
  }, [activeCollection]);

  const loadRequest = useCallback((req: Request) => {
    setActiveRequest(req);
    setMethod(req.method);
    setUrl(req.url);
    setHeaders(req.headers.length ? req.headers : [{ key: 'Content-Type', value: 'application/json' }]);
    setBody(req.body || '');
    setResponse(null);
  }, []);

  const handleHeaderChange = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setHeaders(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  }, []);

  const handleHeaderDelete = useCallback((index: number) => {
    setHeaders(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateTeam = useCallback(async (name: string) => {
    if (!settings) return;
    const team = await createTeam(name, settings.email, settings.name);
    setTeams(prev => [...prev, team]);
  }, [settings]);

  const handleInvite = useCallback(async (teamId: string, teamName: string, email: string, role: TeamRole) => {
    if (!settings) return;
    const invitation = await inviteToTeam(teamId, teamName, email, role, settings.email, settings.name);
    setInvitations(prev => [...prev, invitation]);
  }, [settings]);

  const handleAcceptInvitation = useCallback(async (id: string) => {
    await acceptInvitation(id);
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, status: 'accepted' as const } : i));
    const [newTeams, newInvitations] = await Promise.all([getTeams(), getAllInvitations()]);
    setTeams(newTeams);
    setInvitations(newInvitations);
  }, []);

  const handleDeclineInvitation = useCallback(async (id: string) => {
    await declineInvitation(id);
    setInvitations(prev => prev.map(i => i.id === id ? { ...i, status: 'declined' as const } : i));
  }, []);

  const getStatusClass = (status: number) => {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    return 'status-error';
  };

  const formatResponseBody = (body: string) => {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Pulse</h1>
          <div className="sidebar-tabs">
            {(['collections', 'history', 'environments', 'teams', 'settings'] as const).map(tab => (
              <button 
                key={tab}
                className={`sidebar-tab ${sidebarTab === tab ? 'active' : ''}`}
                onClick={() => setSidebarTab(tab)}
              >
                {tab === 'collections' ? 'Collections' : tab === 'history' ? 'History' : tab === 'environments' ? 'Env' : tab === 'teams' ? 'Teams' : '⚙️'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="sidebar-content">
          {sidebarTab === 'collections' && (
            <>
              {collections.map(col => (
                <div key={col.id}>
                  <div 
                    className={`collection-item ${activeCollection?.id === col.id ? 'active' : ''}`}
                    onClick={() => setActiveCollection(col)}
                  >
                    📁 {col.name}
                  </div>
                  {activeCollection?.id === col.id && col.requests.map(req => (
                    <div 
                      key={req.id}
                      className={`request-item ${activeRequest?.id === req.id ? 'active' : ''}`}
                      onClick={() => loadRequest(req)}
                    >
                      <span className={`method-badge method-${req.method}`}>{req.method}</span>
                      {req.name}
                    </div>
                  ))}
                </div>
              ))}
              <button className="import-btn" onClick={handleImportPostman}>
                📥 Import Postman
              </button>
            </>
          )}
          
          {sidebarTab === 'history' && (
            history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                No history yet. Send a request to see it here.
              </div>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="history-item" onClick={() => loadRequest({
                  id: entry.id,
                  name: entry.url.split('/').pop() || entry.url,
                  method: entry.method,
                  url: entry.url,
                  headers: entry.request.headers,
                  body: entry.request.body,
                })}>
                  <span className={`method-badge method-${entry.method}`}>{entry.method}</span>
                  <span className="history-url">{entry.url}</span>
                  <span className={`status-badge ${getStatusClass(entry.status)}`}>{entry.status}</span>
                  <span className="history-time">{formatTime(entry.timestamp)}</span>
                </div>
              ))
            )
          )}
          
          {sidebarTab === 'environments' && environments.map(env => (
            <div key={env.id} style={{ marginBottom: '16px' }}>
              <div className="section-title">{env.name}</div>
              {env.variables.map((v, i) => (
                <div key={i} className="env-row">
                  <input
                    type="checkbox"
                    checked={v.enabled}
                    onChange={(e) => {
                      setEnvironments(prev => prev.map(env2 => 
                        env2.id === env.id 
                          ? { ...env2, variables: env2.variables.map((v2, j) => j === i ? { ...v2, enabled: e.target.checked } : v2) }
                          : env2
                      ));
                    }}
                  />
                  <input
                    className={v.enabled ? 'enabled' : 'disabled'}
                    value={v.key}
                    onChange={(e) => {
                      setEnvironments(prev => prev.map(env2 => 
                        env2.id === env.id 
                          ? { ...env2, variables: env2.variables.map((v2, j) => j === i ? { ...v2, key: e.target.value } : v2) }
                          : env2
                      ));
                    }}
                  />
                  <input
                    className={v.enabled ? 'enabled' : 'disabled'}
                    value={v.value}
                    onChange={(e) => {
                      setEnvironments(prev => prev.map(env2 => 
                        env2.id === env.id 
                          ? { ...env2, variables: env2.variables.map((v2, j) => j === i ? { ...v2, value: e.target.value } : v2) }
                          : env2
                      ));
                    }}
                  />
                </div>
              ))}
            </div>
          ))}

          {sidebarTab === 'teams' && settings && (
            <TeamPanel
              teams={teams}
              invitations={invitations}
              currentUserEmail={settings.email}
              currentUserName={settings.name}
              onCreateTeam={handleCreateTeam}
              onInvite={handleInvite}
              onAcceptInvitation={handleAcceptInvitation}
              onDeclineInvitation={handleDeclineInvitation}
            />
          )}

          {sidebarTab === 'settings' && settings && (
            <div style={{ padding: '12px' }}>
              <h3 style={{ marginBottom: '16px', color: '#e94560' }}>User Settings</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Name</label>
                <input
                  type="text"
                  className="modal-input"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  className="modal-input"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '4px' }}>Request Timeout (seconds)</label>
                <input
                  type="number"
                  className="modal-input"
                  value={settings.default_timeout_secs}
                  onChange={(e) => setSettings({ ...settings, default_timeout_secs: parseInt(e.target.value) || 30 })}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={settings.follow_redirects}
                    onChange={(e) => setSettings({ ...settings, follow_redirects: e.target.checked })}
                  />
                  Follow Redirects
                </label>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={settings.verify_ssl}
                    onChange={(e) => setSettings({ ...settings, verify_ssl: e.target.checked })}
                  />
                  Verify SSL Certificates
                </label>
              </div>

              <div style={{ marginTop: '20px', padding: '12px', background: '#1a1a2e', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Data Location</h4>
                <p style={{ fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>
                  ~/.pulse/
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div style={{ padding: '12px', borderTop: '1px solid #0f3460' }}>
          <button className="add-btn" style={{ width: '100%' }} onClick={() => setShowSaveModal(true)}>
            + New Collection
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="env-bar">
          <select className="env-select" value={activeEnvId} onChange={(e) => setActiveEnvId(e.target.value)}>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          {activeEnv && activeEnv.variables.filter(v => v.enabled).map(v => (
            <span key={v.key} className="env-var">{`{{${v.key}}}`}</span>
          ))}
        </div>

        <div className="request-area">
          <div className="url-bar">
            <select className="method-select" value={method} onChange={(e) => setMethod(e.target.value as HttpMethod)}>
              {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              className="url-input"
              placeholder="Enter request URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button className="send-btn" onClick={handleSend} disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
            <button className="add-btn" onClick={handleNewRequest}>Save</button>
          </div>

          <div className="request-config">
            {(['headers', 'body'] as const).map(tab => (
              <button 
                key={tab}
                className={`config-tab ${configTab === tab ? 'active' : ''}`}
                onClick={() => setConfigTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {configTab === 'headers' && (
            <div className="section">
              <div className="section-title">Request Headers</div>
              {headers.map((header, i) => (
                <HeaderRow 
                  key={i} 
                  index={i}
                  header={header} 
                  onChange={handleHeaderChange} 
                  onDelete={() => handleHeaderDelete(i)} 
                />
              ))}
              <button className="add-btn" onClick={() => setHeaders(prev => [...prev, { key: '', value: '' }])}>
                + Add Header
              </button>
            </div>
          )}

          {configTab === 'body' && (
            <div className="section">
              <div className="section-title">Request Body</div>
              <textarea
                className="body-textarea"
                placeholder='{"key": "value"}'
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          )}

          <div className="response-area">
            <div className="response-header">
              <span className="section-title" style={{ margin: 0 }}>Response</span>
              {response && (
                <>
                  <StatusBadge status={response.status} />
                  <span className="time-badge">{response.time_ms}ms</span>
                </>
              )}
            </div>
            <div className="response-body">
              {loading ? (
                <div className="loading">Sending request...</div>
              ) : response ? (
                formatResponseBody(response.body)
              ) : (
                <div className="empty-state">Response will appear here</div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Collection</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-btn secondary" onClick={() => setShowSaveModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleNewCollection}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
