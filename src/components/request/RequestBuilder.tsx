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
import { sendRequest } from '../../hooks/useTauri';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { toast } from 'sonner';
import { VariableResolver } from '../../services/variableResolver';
import '../../styles/components/request.css';

type ConfigTab = 'params' | 'headers' | 'body' | 'auth' | 'scripts';

import { useEnvStore } from '../../stores/useEnvStore';
import { executePreRequestScript } from '../../services/scriptRunner';

export default function RequestBuilder() {
  const { tabs, activeTabId, setTabResponse, updateActiveTabRequest } = useTabStore();
  const { collections } = useCollectionStore();
  const { settings } = useSettingsStore();
  const { environments, activeEnvId, updateEnvironment } = useEnvStore();
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
      const { method, url, headers, body, auth, preRequestScript } = activeTab.request;
      
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
      
      // Resolve variables
      const activeEnv = environments.find(e => e.id === activeEnvId);
      const envVars = activeEnv?.variables || [];
      
      const parentCollection = collections.find(c =>
        c.requests.some(r => r.id === activeTab.request.id) ||
        c.folders.some(f => f.requests.some(r => r.id === activeTab.request.id))
      );
      const colVars = parentCollection?.variables || [];

      // Resolve URL
      finalUrl = VariableResolver.resolve(finalUrl, colVars, envVars);

      // Resolve Headers
      const resolvedHeaders: Record<string, string> = {};
      Object.entries(headerRecord).forEach(([key, value]) => {
        const rKey = VariableResolver.resolve(key, colVars, envVars);
        const rValue = VariableResolver.resolve(value, colVars, envVars);
        if (rKey) resolvedHeaders[rKey] = rValue;
      });

      // Resolve Body
      let resolvedBody = { ...body };
      if (body.type === 'raw') {
        resolvedBody.content = VariableResolver.resolve(body.content, colVars, envVars);
      } else if (body.type === 'json') {
        resolvedBody.content = VariableResolver.resolve(body.content, colVars, envVars);
      } else if (body.type === 'graphql' && body.graphql) {
        resolvedBody.graphql = {
          query: VariableResolver.resolve(body.graphql.query, colVars, envVars),
          variables: VariableResolver.resolve(body.graphql.variables, colVars, envVars),
        };
      }

      if (!settings) throw new Error('Settings not loaded');
      
      const response = await sendRequest(method, finalUrl, resolvedHeaders, resolvedBody, settings);
      setTabResponse(activeTab.id, response);
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
        <div style={{ flex: 1, padding: '20px', minHeight: 0 }}>
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
