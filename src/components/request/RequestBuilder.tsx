import { useState, useEffect, useCallback } from 'react';
import UrlBar from './UrlBar';
import BodyEditor from './BodyEditor';
import HeadersEditor from './HeadersEditor';
import ParamsEditor from './ParamsEditor';
import AuthTab from './AuthTab';
import WebSocketPanel from './WebSocketPanel';
import ScriptsEditor from './ScriptsEditor';
import CodeGenerator from '../modals/CodeGenerator';
import SaveRequestModal from '../modals/SaveRequestModal';
import { useTabStore } from '../../stores/useTabStore';
import { useCollectionStore } from '../../stores/useCollectionStore';
import { sendRequest } from '../../hooks/useTauri';
import { VariableResolver } from '../../services/variableResolver';
import { useEnvStore } from '../../stores/useEnvStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useHistoryStore } from '../../stores/useHistoryStore';
import { useGlobalStore } from '../../stores/useGlobalStore';
import * as SandboxEngine from '../../services/SandboxEngine';
import { toast } from 'sonner';
import type { HttpRequest, KeyValuePair } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import '../../styles/components/request.css';

type ConfigTab = 'params' | 'headers' | 'body' | 'auth' | 'scripts';

export default function RequestBuilder() {
  const { 
    tabs, 
    activeTabId, 
    setTabResponse, 
    updateActiveTabRequest, 
    setTabLoading,
    setTabTestResults,
    setTabConsoleLogs,
    clearTabSandboxResults
  } = useTabStore();
  
  const { settings } = useSettingsStore();
  const { environments, activeEnvId, updateEnvironment } = useEnvStore();
  const { collections, updateCollectionVariables } = useCollectionStore();
  const { globalVariables, updateGlobalVariables } = useGlobalStore();
  const { addEntry } = useHistoryStore();
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('params');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  // Sync global loading state to individual tab
  useEffect(() => {
    if (activeTabId) {
      setTabLoading(activeTabId, isLoading);
    }
  }, [isLoading, activeTabId, setTabLoading]);

  const activeTab = tabs.find(t => t.id === activeTabId);
  
  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) {
    return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
          <p>No active request selected.</p>
        </div>
    );
  }

  const request = activeTab.request;
  const isWebSocket = request.url?.startsWith('ws://') || request.url?.startsWith('wss://');

  // Sync protocol based on URL
  useEffect(() => {
    if (isWebSocket && request.protocol !== 'ws') {
      updateActiveTabRequest({ protocol: 'ws' });
    } else if (!isWebSocket && request.protocol === 'ws') {
      updateActiveTabRequest({ protocol: 'http' });
    }
  }, [isWebSocket, request.protocol, activeTabId, updateActiveTabRequest]);

  const handleSend = useCallback(async () => {
    if (!request.url) {
      toast.error('Please enter a URL');
      return;
    }

    if (isWebSocket) {
        // WebSocket connect is handled inside WebSocketPanel
        return;
    }

    setIsLoading(true);
    clearTabSandboxResults(activeTab.id);

    try {
      const { method, url, headers, body, auth, preRequestScript, testScript } = request;

      const activeCollection = collections.find(c => c.id === activeTab.collectionId);
      
      // Get all parent objects (collection and folders) for inheritance
      const inheritanceChain: (any)[] = [];
      if (activeCollection) {
        inheritanceChain.push(activeCollection);
        
        const findParentFolders = (folders: any[], targetId: string, currentPath: any[]): boolean => {
          for (const f of folders) {
            if (f.requests.some((r: any) => r.id === targetId)) {
              inheritanceChain.push(...currentPath, f);
              return true;
            }
            if (f.folders && findParentFolders(f.folders, targetId, [...currentPath, f])) return true;
          }
          return false;
        };
        findParentFolders(activeCollection.folders, request.id, []);
      }

      const getFreshVariables = () => {
        const activeCollection = useCollectionStore.getState().collections.find(c => c.id === activeTab.collectionId);
        const activeEnv = useEnvStore.getState().environments.find(e => e.id === activeEnvId);
        const globalVariables = useGlobalStore.getState().globalVariables;

        const collectionVars = activeCollection?.variables?.filter(v => v.enabled !== false && v.key) || [];
        const envVars = activeEnv?.variables?.filter(v => v.enabled !== false && v.key) || [];
        const globVars = globalVariables.filter(v => v.enabled !== false && v.key) || [];

        const collectionVariablesRecord = collectionVars.reduce((acc, v) => {
          if (v.key) acc[v.key] = v.value;
          return acc;
        }, {} as Record<string, string>);

        const envVariablesRecord = envVars.reduce((acc, v) => {
          if (v.key) acc[v.key] = v.value;
          return acc;
        }, {} as Record<string, string>);

        const globalVariablesRecord = globVars.reduce((acc, v) => {
          if (v.key) acc[v.key] = v.value;
          return acc;
        }, {} as Record<string, string>);

        return {
          collectionVars,
          envVars,
          globalVars: globalVariables,
          collectionVariablesRecord,
          envVariablesRecord,
          globalVariablesRecord
        };
      };

      const getRawRequestHeaders = () => {
        let effectiveAuth = auth;
        if (!auth || auth.type === 'inherit') {
          for (let i = inheritanceChain.length - 1; i >= 0; i--) {
            if (inheritanceChain[i].auth && inheritanceChain[i].auth.type !== 'inherit') {
              effectiveAuth = inheritanceChain[i].auth;
              break;
            }
          }
        }

        const fresh = getFreshVariables();
        const rawHeaders: Record<string, string> = {};
        
        if (effectiveAuth?.type === 'bearer' && effectiveAuth.config?.token) {
          const resolvedToken = VariableResolver.resolve(effectiveAuth.config.token, fresh.collectionVars, fresh.envVars, fresh.globalVars);
          rawHeaders['Authorization'] = `Bearer ${resolvedToken}`;
        } else if (effectiveAuth?.type === 'oauth2' && effectiveAuth.config?.accessToken) {
          const resolvedToken = VariableResolver.resolve(effectiveAuth.config.accessToken, fresh.collectionVars, fresh.envVars, fresh.globalVars);
          rawHeaders['Authorization'] = `Bearer ${resolvedToken}`;
        } else if (effectiveAuth?.type === 'basic' && effectiveAuth.config?.username) {
          const resolvedUsername = VariableResolver.resolve(effectiveAuth.config.username, fresh.collectionVars, fresh.envVars, fresh.globalVars);
          const resolvedPassword = VariableResolver.resolve(effectiveAuth.config.password || '', fresh.collectionVars, fresh.envVars, fresh.globalVars);
          const credentials = btoa(`${resolvedUsername}:${resolvedPassword}`);
          rawHeaders['Authorization'] = `Basic ${credentials}`;
        }

        headers.forEach((h: KeyValuePair) => {
          if (h.enabled !== false && h.key) {
              rawHeaders[h.key] = h.value;
          }
        });

        return rawHeaders;
      };

      // 1. Execute Inherited Pre-request Scripts (Parent to Child)
      let finalUrl = url;

      for (const parent of inheritanceChain) {
        if (parent.preRequestScript && parent.preRequestScript.trim()) {
          const fresh = getFreshVariables();
          const rawHeaders = getRawRequestHeaders();

          // Resolve URL and headers before passing to script
          const resolvedUrl = VariableResolver.resolve(finalUrl, fresh.collectionVars, fresh.envVars, fresh.globalVars);
          const resolvedHeaders: Record<string, string> = {};
          Object.entries(rawHeaders).forEach(([key, value]) => {
            resolvedHeaders[key] = VariableResolver.resolve(value, fresh.collectionVars, fresh.envVars, fresh.globalVars);
          });

          const sandboxContext = {
            request: { url: resolvedUrl, method, headers: resolvedHeaders },
            variables: {
              environment: fresh.envVariablesRecord,
              collection: fresh.collectionVariablesRecord,
              globals: fresh.globalVariablesRecord
            }
          };

          const res = await SandboxEngine.executeScript(parent.preRequestScript, sandboxContext);
          
          if (res.logs && res.logs.length > 0) {
            setTabConsoleLogs(activeTab.id, res.logs);
          }
          if (res.tests && res.tests.length > 0) {
            setTabTestResults(activeTab.id, res.tests);
          }

          if (res.error) {
            setTabConsoleLogs(activeTab.id, [{
              type: 'error',
              message: `Inherited Pre-request Script Error: ${res.error}`,
              timestamp: new Date().toISOString()
            }]);
            setIsLoading(false);
            return;
          }

          // Handle environment updates from inherited scripts
          const envUpdates = (res.context as any)?.environmentUpdates;
          if (envUpdates && Object.keys(envUpdates).length > 0 && activeEnvId) {
            const currentEnv = useEnvStore.getState().environments.find(e => e.id === activeEnvId);
            if (currentEnv) {
              const newVariables = [...currentEnv.variables];
              Object.entries(envUpdates).forEach(([key, value]) => {
                const idx = newVariables.findIndex(v => v.key === key);
                if (idx >= 0) newVariables[idx] = { ...newVariables[idx], value: String(value) };
                else newVariables.push({ key, value: String(value), enabled: true });
              });
              await useEnvStore.getState().updateEnvironment(activeEnvId, { variables: newVariables });
            }
          }

          // Handle collection updates from inherited scripts
          const colUpdates = (res.context as any)?.collectionUpdates;
          if (colUpdates && Object.keys(colUpdates).length > 0 && activeTab.collectionId) {
            await updateCollectionVariables(activeTab.collectionId, colUpdates);
          }

          // Handle global updates from inherited scripts
          const globUpdates = (res.context as any)?.globalUpdates;
          if (globUpdates && Object.keys(globUpdates).length > 0) {
            updateGlobalVariables(globUpdates);
          }
        }
      }
      
      // 1.b Execute Local Pre-request Script
      if (preRequestScript && preRequestScript.trim()) {
        const fresh = getFreshVariables();
        const rawHeaders = getRawRequestHeaders();

        // Resolve URL and headers before passing to script
        const resolvedUrl = VariableResolver.resolve(finalUrl, fresh.collectionVars, fresh.envVars, fresh.globalVars);
        const resolvedHeaders: Record<string, string> = {};
        Object.entries(rawHeaders).forEach(([key, value]) => {
          resolvedHeaders[key] = VariableResolver.resolve(value, fresh.collectionVars, fresh.envVars, fresh.globalVars);
        });

        const sandboxContext = {
          request: { url: resolvedUrl, method, headers: resolvedHeaders },
          variables: {
            environment: fresh.envVariablesRecord,
            collection: fresh.collectionVariablesRecord,
            globals: fresh.globalVariablesRecord
          }
        };

        const scriptResult = await SandboxEngine.executeScript(preRequestScript, sandboxContext);
        
        if (scriptResult.logs && scriptResult.logs.length > 0) {
          setTabConsoleLogs(activeTab.id, scriptResult.logs);
        }
        if (scriptResult.tests && scriptResult.tests.length > 0) {
          setTabTestResults(activeTab.id, scriptResult.tests);
        }

        if (scriptResult.error) {
          setTabConsoleLogs(activeTab.id, [{
            type: 'error',
            message: `Pre-request Script Error: ${scriptResult.error}`,
            timestamp: new Date().toISOString()
          }]);
          setIsLoading(false);
          return;
        }

        // Handle environment updates from local script
        const envUpdates = (scriptResult.context as any)?.environmentUpdates;
        if (envUpdates && Object.keys(envUpdates).length > 0 && activeEnvId) {
          const currentEnv = useEnvStore.getState().environments.find(e => e.id === activeEnvId);
          if (currentEnv) {
            const newVariables = [...currentEnv.variables];
            Object.entries(envUpdates).forEach(([key, value]) => {
              const idx = newVariables.findIndex(v => v.key === key);
              if (idx >= 0) newVariables[idx] = { ...newVariables[idx], value: String(value) };
              else newVariables.push({ key, value: String(value), enabled: true });
            });
            await useEnvStore.getState().updateEnvironment(activeEnvId, { variables: newVariables });
          }
        }

        // Handle collection updates from local script
        const colUpdates = (scriptResult.context as any)?.collectionUpdates;
        if (colUpdates && Object.keys(colUpdates).length > 0 && activeTab.collectionId) {
          await updateCollectionVariables(activeTab.collectionId, colUpdates);
        }

        // Handle global updates from local script
        const globUpdates = (scriptResult.context as any)?.globalUpdates;
        if (globUpdates && Object.keys(globUpdates).length > 0) {
          updateGlobalVariables(globUpdates);
        }
      }

      // 2. Final Variable Resolution Pass on URL, Headers, and Body
      const freshFinal = getFreshVariables();
      const finalRawHeaders = getRawRequestHeaders();
      
      finalUrl = VariableResolver.resolve(finalUrl, freshFinal.collectionVars, freshFinal.envVars, freshFinal.globalVars);
      
      const resolvedHeaders: Record<string, string> = {};
      Object.entries(finalRawHeaders).forEach(([key, value]) => {
        resolvedHeaders[key] = VariableResolver.resolve(value, freshFinal.collectionVars, freshFinal.envVars, freshFinal.globalVars);
      });
      
      // Resolve variables in body content if it's a string
      let resolvedBody = body;
      if (body && typeof body === 'object' && 'content' in body && typeof body.content === 'string') {
        resolvedBody = {
          ...body,
          content: VariableResolver.resolve(body.content, freshFinal.collectionVars, freshFinal.envVars, freshFinal.globalVars)
        };
      }
      
      if (!settings) throw new Error('Settings not loaded');
      
      const response = await sendRequest(method, finalUrl, resolvedHeaders, resolvedBody, settings);
      setTabResponse(activeTab.id, response);

      // Save to history
      const httpRequest: HttpRequest = {
        method: request.method,
        url: finalUrl,
        headers: Object.entries(resolvedHeaders).map(([key, value]) => ({ key, value })),
        body: resolvedBody,
        preRequestScript: request.preRequestScript,
      };
      
      await addEntry({
        id: uuidv4(),
        requestId: request.id,
        requestName: request.name,
        timestamp: new Date().toISOString(),
        method: request.method,
        url: finalUrl,
        status: response.status,
        time_ms: response.time_ms,
        request: httpRequest,
        response: response,
      });

      // 3. Execute Test Script (Post-request) using new SandboxEngine
      if (testScript && testScript.trim()) {
        try {
          const freshPost = getFreshVariables();
          // Construct execution context for the sandbox
          const sandboxContext = {
            response: {
              status: response.status,
              statusText: response.status_text,
              headers: response.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
              body: response.body,
              time: response.time_ms
            },
            variables: {
              environment: freshPost.envVariablesRecord,
              collection: freshPost.collectionVariablesRecord,
              globals: freshPost.globalVariablesRecord
            }
          };

          const sandboxResult = await SandboxEngine.executeScript(testScript, sandboxContext);
          
          setTabTestResults(activeTab.id, sandboxResult.tests);
          setTabConsoleLogs(activeTab.id, sandboxResult.logs);

          if (sandboxResult.error) {
            toast.error(`Script error: ${sandboxResult.error}`);
          }
        } catch (sandboxError: any) {
          console.error('Sandbox execution failed:', sandboxError);
          setTabConsoleLogs(activeTab.id, [{
            type: 'error',
            message: `Sandbox Error: ${sandboxError.message || String(sandboxError)}`,
            timestamp: new Date().toISOString()
          }]);
        }
      }

      // 3.b Execute Inherited Test Scripts (Child to Parent)
      for (let i = inheritanceChain.length - 1; i >= 0; i--) {
        const parent = inheritanceChain[i];
        if (parent.testScript && parent.testScript.trim()) {
          try {
            const freshPost = getFreshVariables();
            const sandboxContext = {
              response: {
                status: response.status,
                statusText: response.status_text,
                headers: response.headers.reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {}),
                body: response.body,
                time: response.time_ms
              },
              variables: {
                environment: freshPost.envVariablesRecord,
                collection: freshPost.collectionVariablesRecord,
                globals: freshPost.globalVariablesRecord
              }
            };

            const sandboxResult = await SandboxEngine.executeScript(parent.testScript, sandboxContext);
            
            setTabTestResults(activeTab.id, sandboxResult.tests);
            setTabConsoleLogs(activeTab.id, sandboxResult.logs);

            if (sandboxResult.error) {
              toast.error(`Inherited script error: ${sandboxResult.error}`);
            }
          } catch (sandboxError: any) {
            console.error('Inherited sandbox execution failed:', sandboxError);
          }
        }
      }
    } catch (error: any) {
      toast.error('Request failed: ' + String(error.message || error));
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isWebSocket, environments, activeEnvId, updateEnvironment, setTabResponse, settings, globalVariables, request, clearTabSandboxResults, setTabTestResults, setTabConsoleLogs, addEntry, collections, updateCollectionVariables, updateGlobalVariables]);

  useEffect(() => {
    const onSendRequest = () => handleSend();
    const onSaveRequest = () => setIsSaveModalOpen(true);
    
    window.addEventListener('pulse:send-request', onSendRequest);
    window.addEventListener('pulse:save-entity', onSaveRequest);
    
    return () => {
      window.removeEventListener('pulse:send-request', onSendRequest);
      window.removeEventListener('pulse:save-entity', onSaveRequest);
    };
  }, [handleSend]);

  const configTabs: { id: ConfigTab; label: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'headers', label: 'Headers' },
    { id: 'body', label: 'Body' },
    { id: 'auth', label: 'Auth' },
    { id: 'scripts', label: 'Scripts' }
  ];

  return (
    <div className="request-builder">
      <UrlBar onSend={handleSend} onCode={() => setIsCodeModalOpen(true)} onSave={() => setIsSaveModalOpen(true)} isLoading={isLoading} />
      
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
      <SaveRequestModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} request={request} />
    </div>
  );
}
