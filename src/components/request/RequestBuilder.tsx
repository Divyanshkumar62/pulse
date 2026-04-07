import { useState, useEffect, useCallback } from 'react';
import UrlBar from './UrlBar';
import BodyEditor from './BodyEditor';
import HeadersEditor from './HeadersEditor';
import ParamsEditor from './ParamsEditor';
import AuthTab from './AuthTab';
import WebSocketPanel from './WebSocketPanel';
import ScriptsEditor from './ScriptsEditor';
import CodeGenerator from '../modals/CodeGenerator';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { sendRequest } from '../../hooks/useTauri';
import { VariableResolver } from '../../services/variableResolver';
import { useEnvStore } from '../../stores/useEnvStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { toast } from 'sonner';
import type { HttpRequest } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/components/request.css';

type ConfigTab = 'params' | 'headers' | 'body' | 'auth' | 'scripts';
import { executePreRequestScript } from '../../services/scriptRunner';

export default function RequestBuilder() {
  const { tabs, activeTabId, setTabResponse, updateActiveTabRequest } = useTabStore();
  const { settings } = useSettingsStore();
  const { environments, activeEnvId, updateEnvironment } = useEnvStore();
  const { collections } = useCollectionStore();
  const { addEntry } = useHistoryStore();
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('params');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  const isWebSocket = activeTab?.request.url?.startsWith('ws://') || activeTab?.request.url?.startsWith('wss://');

  // Sync protocol based on URL
  useEffect(() => {
    if (!activeTab) return;
    if (isWebSocket && activeTab.request.protocol !== 'ws') {
      updateActiveTabRequest({ protocol: 'ws' });
    } else if (!isWebSocket && activeTab.request.protocol === 'ws') {
      updateActiveTabRequest({ protocol: 'http' });
    }
  }, [isWebSocket, activeTab?.request.protocol, activeTabId, updateActiveTabRequest]);

  const handleSend = useCallback(async () => {
    if (!activeTab || !activeTab.request.url) {
      toast.error('Please enter a URL');
      return;
    }

    if (isWebSocket) {
        // WebSocket connect is handled inside WebSocketPanel
        return;
    }

    setIsLoading(true);
    try {
      const { method, url, headers, body, auth, preRequestScript, testScript } = activeTab.request;
      
      // 1. Execute Pre-request Script
      let finalUrl = url;
      const injectedHeaders: Record<string, string> = {};
      
      if (preRequestScript) {
        const activeEnv = environments.find(e => e.id === activeEnvId);
        const scriptResult = executePreRequestScript(preRequestScript, activeTab.request, activeEnv);
        
        if (scriptResult.modifiedUrl) {
          finalUrl = scriptResult.modifiedUrl;
        }
        
        scriptResult.addedHeaders.forEach(h => {
          injectedHeaders[h.key] = h.value;
        });
        
        // Apply environment updates
        if (Object.keys(scriptResult.environmentUpdates).length > 0 && activeEnv) {
          const newVariables = [...activeEnv.variables];
          Object.entries(scriptResult.environmentUpdates).forEach(([key, value]) => {
            const idx = newVariables.findIndex(v => v.key === key);
            if (idx >= 0) {
              newVariables[idx] = { ...newVariables[idx], value };
            } else {
              newVariables.push({ key, value, enabled: true });
            }
          });
          updateEnvironment(activeEnv.id, { variables: newVariables });
        }
      }

      const headerRecord: Record<string, string> = { ...injectedHeaders };
      
      if (auth?.type === 'bearer' && auth.config?.token) {
        headerRecord['Authorization'] = `Bearer ${auth.config.token}`;
      } else if (auth?.type === 'oauth2' && auth.config?.accessToken) {
        headerRecord['Authorization'] = `Bearer ${auth.config.accessToken}`;
      }

      headers.forEach(h => {
        if (h.enabled !== false && h.key) {
            headerRecord[h.key] = h.value;
        }
      });
      
      // Resolve variables in URL and headers before sending
      const activeEnv = environments.find(e => e.id === activeEnvId);
      const envVars = activeEnv?.variables?.filter(v => v.enabled !== false && v.key) || [];
      
      const activeCollection = collections.find(c => c.id === activeTab.collectionId);
      const collectionVars = activeCollection?.variables?.filter(v => v.enabled !== false && v.key) || [];
      
      finalUrl = VariableResolver.resolve(finalUrl, collectionVars, envVars);
      
      // Resolve variables in header values
      const resolvedHeaders: Record<string, string> = {};
      Object.entries(headerRecord).forEach(([key, value]) => {
        resolvedHeaders[key] = VariableResolver.resolve(value, collectionVars, envVars);
      });
      
      // Resolve variables in body content if it's a string
      let resolvedBody = body;
      if (body && typeof body === 'object' && 'content' in body && typeof body.content === 'string') {
        resolvedBody = {
          ...body,
          content: VariableResolver.resolve(body.content, collectionVars, envVars)
        };
      }
      
      if (!settings) throw new Error('Settings not loaded');
      
      const response = await sendRequest(method, finalUrl, resolvedHeaders, resolvedBody, settings);
      setTabResponse(activeTab.id, response);

      // Save to history
      const httpRequest: HttpRequest = {
        method: activeTab.request.method,
        url: finalUrl,
        headers: Object.entries(resolvedHeaders).map(([key, value]) => ({ key, value })),
        body: resolvedBody,
        preRequestScript: activeTab.request.preRequestScript,
      };
      await addEntry({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        method: activeTab.request.method,
        url: finalUrl,
        status: response.status,
        time_ms: response.time_ms,
        request: httpRequest,
        response: response,
      });

      // 3. Execute Test Script (Post-request)
      if (testScript) {
        const activeEnv = environments.find(e => e.id === activeEnvId);
        // We reuse the same sandbox logic, but now inject the response
        const testResult = executePreRequestScript(testScript, activeTab.request, activeEnv, response);
        
        // Apply environment updates from the test script (Request Chaining)
        if (Object.keys(testResult.environmentUpdates).length > 0 && activeEnv) {
          const newVariables = [...activeEnv.variables];
          Object.entries(testResult.environmentUpdates).forEach(([key, value]) => {
            const idx = newVariables.findIndex(v => v.key === key);
            if (idx >= 0) {
              newVariables[idx] = { ...newVariables[idx], value };
            } else {
              newVariables.push({ key, value, enabled: true });
            }
          });
          updateEnvironment(activeEnv.id, { variables: newVariables });
        }
      }
    } catch (error: any) {
      toast.error('Request failed: ' + String(error.message || error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isWebSocket, environments, activeEnvId, updateEnvironment, setTabResponse, settings]);

  useEffect(() => {
    const onSendRequest = () => handleSend();
    window.addEventListener('pulse:send-request', onSendRequest);
    return () => window.removeEventListener('pulse:send-request', onSendRequest);
  }, [handleSend]);

  if (!activeTabId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
        <p>No active request. Open a tab to begin.</p>
      </div>
    );
  }

  const configTabs: { id: ConfigTab; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts' }
  ];

  return (
    <div className="request-builder">
      <UrlBar onSend={handleSend} onCode={() => setIsCodeModalOpen(true)} isLoading={isLoading} />
      
      {isWebSocket ? (
        <div className="websocket-container-glass">
          <WebSocketPanel />
        </div>
      ) : (
        <>
          <div className="request-config-tabs">
            {configTabs.map(tab => (
              <button
                key={tab.id}
                className={`config-tab ${activeConfigTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveConfigTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="request-config-area">
            {activeConfigTab === 'params' && <ParamsEditor />}
            {activeConfigTab === 'headers' && <HeadersEditor />}
            {activeConfigTab === 'body' && <BodyEditor />}
            {activeConfigTab === 'auth' && <AuthTab />}
            {activeConfigTab === 'scripts' && <ScriptsEditor />}
          </div>
        </>
      )}
      
      <CodeGenerator isOpen={isCodeModalOpen} onClose={() => setIsCodeModalOpen(false)} />
    </div>
  );
}
