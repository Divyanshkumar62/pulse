import React from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { AuthConfig } from '../../types';
import { toast } from 'sonner';
import { startOAuthFlow, exchangeOAuthToken } from '../../hooks/useTauri';
import CustomSelect from '../ui/CustomSelect';

export default function AuthTab() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const auth = activeTab?.request.auth || { type: 'none' };

  const handleGetToken = async () => {
    const { authUrl, tokenUrl, clientId, scopes } = auth.config || {};
    if (!authUrl || !tokenUrl || !clientId) {
      toast.error('Missing OAuth configuration (Auth URL, Token URL, or Client ID)');
      return;
    }

    try {
      toast.loading('Waiting for browser authentication...', { id: 'oauth-flow' });
      const flowResult = await startOAuthFlow(authUrl, clientId, scopes || '');
      
      toast.loading('Exchanging code for token...', { id: 'oauth-flow' });
      const tokenResponse = await exchangeOAuthToken(
        tokenUrl,
        flowResult.code,
        flowResult.code_verifier,
        clientId,
        auth.config?.clientSecret || null,
        flowResult.redirect_uri
      );

      // Simple JSON extraction for now
      try {
        const body = JSON.parse(tokenResponse);
        const accessToken = body.access_token;
        if (accessToken) {
          updateConfig({ accessToken });
          toast.success('Token acquired successfully!', { id: 'oauth-flow' });
        } else {
          throw new Error('No access_token found in response');
        }
      } catch (e) {
        // Fallback: If not JSON or missing access_token, just show raw response
        toast.error('Could not parse token response automatically', { id: 'oauth-flow' });
        console.warn('Raw token response:', tokenResponse);
      }
    } catch (err: any) {
      toast.error('OAuth flow failed: ' + err.message, { id: 'oauth-flow' });
    }
  };

  const handleTypeChange = (type: AuthConfig['type']) => {
    updateActiveTabRequest({ auth: { ...auth, type } });
  };

  const updateConfig = (updates: any) => {
    updateActiveTabRequest({ 
      auth: { 
        ...auth, 
        config: { ...(auth.config || {}), ...updates } 
      } 
    });
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Auth Type</label>
        <CustomSelect 
          value={auth.type}
          onChange={(val) => handleTypeChange(val as any)}
          options={[
            { value: 'none', label: 'No Auth' },
            { value: 'bearer', label: 'Bearer Token' },
            { value: 'oauth2', label: 'OAuth 2.0' },
          ]}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
        {auth.type === 'none' && (
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            This request does not use any authentication.
          </p>
        )}

        {auth.type === 'bearer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Token</label>
            <input 
              type="text" 
              placeholder="Enter Bearer Token"
              value={auth.config?.token || ''}
              onChange={(e) => updateConfig({ token: e.target.value })}
              style={{ 
                padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', 
                borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'var(--font-mono)'
              }}
            />
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              The token will be automatically added as an <code>Authorization: Bearer &lt;token&gt;</code> header.
            </p>
          </div>
        )}

        {auth.type === 'oauth2' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Grant Type</label>
                <select 
                   disabled
                   style={{ padding: '6px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '12px' }}
                >
                  <option>Authorization Code (PKCE)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Auth URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/oauth/authorize"
                  value={auth.config?.authUrl || ''}
                  onChange={(e) => updateConfig({ authUrl: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Token URL</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/oauth/token"
                  value={auth.config?.tokenUrl || ''}
                  onChange={(e) => updateConfig({ tokenUrl: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Client ID</label>
                <input 
                  type="text" 
                  value={auth.config?.clientId || ''}
                  onChange={(e) => updateConfig({ clientId: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Client Secret (Optional)</label>
                <input 
                  type="password" 
                  value={auth.config?.clientSecret || ''}
                  onChange={(e) => updateConfig({ clientSecret: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Scopes</label>
                <input 
                  type="text" 
                  placeholder="openid profile email"
                  value={auth.config?.scopes || ''}
                  onChange={(e) => updateConfig({ scopes: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </div>

            <button 
              style={{ 
                marginTop: '10px', padding: '10px', backgroundColor: 'var(--accent-primary)', color: 'white', 
                border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' 
              }}
              onClick={handleGetToken}
            >
              Get New Access Token
            </button>

            {auth.config?.accessToken && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Access Token</label>
                <div style={{ 
                  padding: '8px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', 
                  borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '11px', wordBreak: 'break-all',
                  fontFamily: 'var(--font-mono)' 
                }}>
                  {auth.config.accessToken}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
