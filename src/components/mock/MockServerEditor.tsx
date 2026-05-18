import { useState, useEffect } from 'react';
import { useMockStore } from '../../stores/useMockStore';
import { MockServer, MockRoute, KeyValuePair } from '../../types';
import { Play, Square, Plus, Trash2, Edit3, Save, Server, Globe } from 'lucide-react';
import '../../styles/components/mock-editor.css';

export default function MockServerEditor() {
  const { 
    mockServers, 
    activeMockServerId, 
    updateMockServer, 
    startMockServer, 
    stopMockServer 
  } = useMockStore();

  const activeServer = mockServers.find(s => s.id === activeMockServerId);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverPort, setServerPort] = useState<number>(3000);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state with active server when it changes
  useEffect(() => {
    if (activeServer) {
      setServerName(activeServer.name);
      setServerPort(activeServer.port);
      setErrorMessage(null);
      if (activeServer.routes.length > 0 && !selectedRouteId) {
        setSelectedRouteId(activeServer.routes[0].id);
      } else if (activeServer.routes.length === 0) {
        setSelectedRouteId(null);
      }
    }
  }, [activeServer]);

  if (!activeServer) {
    return (
      <div className="mock-editor-empty">
        <Server size={48} className="mock-empty-icon" />
        <h3>No Mock Server Selected</h3>
        <p>Choose or create a mock server from the sidebar to get started.</p>
      </div>
    );
  }

  const selectedRoute = activeServer.routes.find(r => r.id === selectedRouteId);

  const handleSaveServerName = () => {
    if (serverName.trim()) {
      updateMockServer(activeServer.id, { name: serverName.trim() });
    }
    setIsEditingName(false);
  };

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = parseInt(e.target.value) || 0;
    setServerPort(p);
  };

  const handleSavePort = () => {
    if (serverPort > 0 && serverPort < 65536) {
      updateMockServer(activeServer.id, { port: serverPort });
      setErrorMessage(null);
    } else {
      setErrorMessage('Port must be between 1 and 65535');
    }
  };

  const handleToggleStatus = async () => {
    setErrorMessage(null);
    try {
      if (activeServer.status === 'active') {
        await stopMockServer(activeServer.id);
      } else {
        await startMockServer(activeServer.id);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to start mock server');
    }
  };

  const handleAddRoute = () => {
    const newRoute: MockRoute = {
      id: crypto.randomUUID(),
      path: '/api/v1/resource',
      method: 'GET',
      statusCode: 200,
      responseBody: '{\n  "status": "success",\n  "data": {}\n}',
      headers: [{ key: 'Content-Type', value: 'application/json' }]
    };

    const updatedRoutes = [...activeServer.routes, newRoute];
    updateMockServer(activeServer.id, { routes: updatedRoutes });
    setSelectedRouteId(newRoute.id);
  };

  const handleDeleteRoute = (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedRoutes = activeServer.routes.filter(r => r.id !== routeId);
    updateMockServer(activeServer.id, { routes: updatedRoutes });
    if (selectedRouteId === routeId) {
      setSelectedRouteId(updatedRoutes[0]?.id || null);
    }
  };

  const handleUpdateRoute = (routeId: string, updates: Partial<MockRoute>) => {
    const updatedRoutes = activeServer.routes.map(r => 
      r.id === routeId ? { ...r, ...updates } : r
    );
    updateMockServer(activeServer.id, { routes: updatedRoutes });
  };

  // Headers editing helper functions
  const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
    if (!selectedRoute) return;
    const updatedHeaders = [...selectedRoute.headers];
    updatedHeaders[index] = { ...updatedHeaders[index], [field]: value };
    handleUpdateRoute(selectedRoute.id, { headers: updatedHeaders });
  };

  const handleAddHeader = () => {
    if (!selectedRoute) return;
    const updatedHeaders = [...selectedRoute.headers, { key: '', value: '' }];
    handleUpdateRoute(selectedRoute.id, { headers: updatedHeaders });
  };

  const handleDeleteHeader = (index: number) => {
    if (!selectedRoute) return;
    const updatedHeaders = selectedRoute.headers.filter((_, i) => i !== index);
    handleUpdateRoute(selectedRoute.id, { headers: updatedHeaders });
  };

  const getMethodBadgeClass = (method: string) => {
    return `method-badge badge-${method.toLowerCase()}`;
  };

  return (
    <div className="mock-editor-container">
      {/* Top Header Panel */}
      <div className="mock-editor-header">
        <div className="mock-header-left">
          <div className="mock-title-row">
            {isEditingName ? (
              <div className="mock-title-edit-container">
                <input 
                  type="text" 
                  value={serverName} 
                  onChange={(e) => setServerName(e.target.value)}
                  onBlur={handleSaveServerName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveServerName()}
                  autoFocus
                  className="mock-title-input"
                />
                <button onClick={handleSaveServerName} className="btn-save-inline">
                  Save
                </button>
              </div>
            ) : (
              <div className="mock-title-display-container">
                <h2>{activeServer.name}</h2>
                <button onClick={() => setIsEditingName(true)} className="btn-icon-subtle">
                  <Edit3 size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="mock-server-info-row">
            <div className="mock-info-item">
              <span className="info-label">Port:</span>
              <input 
                type="number" 
                value={serverPort} 
                onChange={handlePortChange} 
                onBlur={handleSavePort}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePort()}
                disabled={activeServer.status === 'active'}
                className="mock-port-input"
              />
            </div>
            
            <div className="mock-status-indicator">
              <span className={`status-dot ${activeServer.status}`}></span>
              <span className="status-text">
                {activeServer.status === 'active' 
                  ? `Active (http://localhost:${activeServer.port})` 
                  : 'Inactive'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="mock-header-right">
          <button 
            onClick={handleToggleStatus} 
            className={`btn-action-premium ${activeServer.status === 'active' ? 'stop' : 'start'}`}
          >
            {activeServer.status === 'active' ? (
              <>
                <Square size={16} fill="currentColor" />
                <span>Stop Server</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>Start Server</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mock-error-banner">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="error-close-btn">&times;</button>
        </div>
      )}

      {/* Main Workspace Area (Columns) */}
      <div className="mock-editor-workspace">
        {/* Left Side: Routes List */}
        <div className="mock-routes-sidebar">
          <div className="sidebar-header-row">
            <h3>Routes</h3>
            <button onClick={handleAddRoute} className="btn-add-route">
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          <div className="routes-list-container">
            {activeServer.routes.length === 0 ? (
              <div className="routes-empty-state">
                <p>No routes configured.</p>
                <button onClick={handleAddRoute} className="btn-secondary-subtle">
                  Create a Route
                </button>
              </div>
            ) : (
              activeServer.routes.map(route => (
                <div 
                  key={route.id}
                  className={`route-item-row ${selectedRouteId === route.id ? 'active' : ''}`}
                  onClick={() => setSelectedRouteId(route.id)}
                >
                  <span className={getMethodBadgeClass(route.method)}>
                    {route.method}
                  </span>
                  <span className="route-item-path" title={route.path}>
                    {route.path}
                  </span>
                  <button 
                    onClick={(e) => handleDeleteRoute(route.id, e)}
                    className="route-delete-btn"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Active Route Form */}
        <div className="mock-route-editor">
          {selectedRoute ? (
            <div className="route-form-container">
              <div className="form-section">
                <h3 className="section-title">Route Settings</h3>
                
                <div className="form-grid">
                  <div className="form-group method-group">
                    <label>Method</label>
                    <select 
                      value={selectedRoute.method} 
                      onChange={(e) => handleUpdateRoute(selectedRoute.id, { method: e.target.value })}
                      className="mock-select-input"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                      <option value="OPTIONS">OPTIONS</option>
                      <option value="HEAD">HEAD</option>
                    </select>
                  </div>

                  <div className="form-group path-group">
                    <label>Path</label>
                    <input 
                      type="text" 
                      value={selectedRoute.path} 
                      onChange={(e) => handleUpdateRoute(selectedRoute.id, { path: e.target.value })}
                      placeholder="/api/v1/users"
                      className="mock-text-input"
                    />
                  </div>

                  <div className="form-group status-group">
                    <label>Status Code</label>
                    <input 
                      type="number" 
                      value={selectedRoute.statusCode} 
                      onChange={(e) => handleUpdateRoute(selectedRoute.id, { statusCode: parseInt(e.target.value) || 200 })}
                      placeholder="200"
                      className="mock-text-input"
                    />
                  </div>
                </div>
              </div>

              {/* Headers Section */}
              <div className="form-section">
                <div className="section-header-row">
                  <h3 className="section-title">Response Headers</h3>
                  <button onClick={handleAddHeader} className="btn-add-item-subtle">
                    + Add Header
                  </button>
                </div>

                <div className="headers-table-container">
                  {selectedRoute.headers.length === 0 ? (
                    <div className="table-empty-message">No custom response headers set.</div>
                  ) : (
                    selectedRoute.headers.map((header, idx) => (
                      <div key={idx} className="header-kv-row">
                        <input 
                          type="text" 
                          placeholder="Key" 
                          value={header.key} 
                          onChange={(e) => handleHeaderChange(idx, 'key', e.target.value)}
                          className="kv-input-key"
                        />
                        <input 
                          type="text" 
                          placeholder="Value" 
                          value={header.value} 
                          onChange={(e) => handleHeaderChange(idx, 'value', e.target.value)}
                          className="kv-input-value"
                        />
                        <button 
                          onClick={() => handleDeleteHeader(idx)}
                          className="btn-kv-delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Body Section */}
              <div className="form-section body-section">
                <h3 className="section-title">Response Body</h3>
                <textarea 
                  value={selectedRoute.responseBody} 
                  onChange={(e) => handleUpdateRoute(selectedRoute.id, { responseBody: e.target.value })}
                  placeholder='{\n  "message": "Hello World"\n}'
                  className="mock-body-textarea"
                />
              </div>
            </div>
          ) : (
            <div className="route-editor-empty">
              <Globe size={40} className="route-empty-icon" />
              <h4>Select or Add a Route</h4>
              <p>Configure paths, methods, status codes, and mock JSON payloads for this server.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
