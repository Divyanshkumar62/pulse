import React from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { AuthConfig } from '../../types';
import { toast } from 'sonner';
import { startOAuthFlow, exchangeOAuthToken } from '../../hooks/useTauri';
import CustomSelect from '../ui/CustomSelect';

export default function AuthTab() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const auth = activeTab.request.auth || { type: 'none', config: {} };

  const handleGetToken = async () => {
    const config = auth.config || {};
    const { authUrl, tokenUrl, clientId, scopes } = config;
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
        config?.clientSecret || null,
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
        toast.error('Could not parse token response automatically', { id: 'oauth-flow' });
      }
    } catch (err: any) {
      toast.error('OAuth flow failed: ' + err.message, { id: 'oauth-flow' });
    }
  };

  const handleTypeChange = (type: AuthConfig['type']) => {
    updateActiveTabRequest({ auth: { ...auth, type, config: auth.config || {} } });
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
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', width: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 500 }}>Auth Type</label>
        <CustomSelect 
          value={auth.type}
          onChange={(val) => handleTypeChange(val as any)}
          options={[
            { value: 'none', label: 'No Auth' },
            { value: 'inherit', label: 'Inherit from Parent' },
            { value: 'bearer', label: 'Bearer Token' },
            { value: 'basic', label: 'Basic Auth' },
            { value: 'apiKey', label: 'API Key' },
            { value: 'digest', label: 'Digest Auth' },
            { value: 'awsSigV4', label: 'AWS Signature V4' },
            { value: 'jwt', label: 'JWT (Auto-Refresh)' },
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

        {auth.type === 'inherit' && (
          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            This request inherits authentication from its parent folder or collection.
          </p>
        )}

        {auth.type === 'basic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Username</label>
              <input 
                type="text" 
                placeholder="Username"
                value={auth.config?.username || ''}
                onChange={(e) => updateConfig({ username: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Password</label>
              <input 
                type="password" 
                placeholder="Password"
                value={auth.config?.password || ''}
                onChange={(e) => updateConfig({ password: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
          </div>
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

        {auth.type === 'apiKey' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Key</label>
                <input
                  type="text"
                  placeholder="X-API-Key"
                  value={auth.config?.key || ''}
                  onChange={(e) => updateConfig({ key: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Value</label>
                <input
                  type="password"
                  placeholder="API key value"
                  value={auth.config?.value || ''}
                  onChange={(e) => updateConfig({ value: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Add to</label>
              <select
                value={auth.config?.addTo || 'header'}
                onChange={(e) => updateConfig({ addTo: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Sent as a request header or appended to the URL as a query parameter.
            </p>
          </div>
        )}

        {auth.type === 'digest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Username</label>
              <input
                type="text"
                placeholder="Username"
                value={auth.config?.username || ''}
                onChange={(e) => updateConfig({ username: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Password</label>
              <input
                type="password"
                placeholder="Password"
                value={auth.config?.password || ''}
                onChange={(e) => updateConfig({ password: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Pulse answers the server's 401 challenge automatically (MD5, supports qop=auth).
            </p>
          </div>
        )}

        {auth.type === 'awsSigV4' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Access Key ID</label>
                <input
                  type="text"
                  placeholder="AKIA..."
                  value={auth.config?.accessKey || ''}
                  onChange={(e) => updateConfig({ accessKey: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Secret Access Key</label>
                <input
                  type="password"
                  placeholder="Secret key"
                  value={auth.config?.secretKey || ''}
                  onChange={(e) => updateConfig({ secretKey: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Region</label>
                <input
                  type="text"
                  placeholder="us-east-1"
                  value={auth.config?.region || ''}
                  onChange={(e) => updateConfig({ region: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Service</label>
                <input
                  type="text"
                  placeholder="s3, execute-api, ..."
                  value={auth.config?.service || ''}
                  onChange={(e) => updateConfig({ service: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Session Token (optional)</label>
              <input
                type="password"
                placeholder="Temporary credentials token"
                value={auth.config?.sessionToken || ''}
                onChange={(e) => updateConfig({ sessionToken: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Signs the request with AWS Signature Version 4 (canonical request + HMAC-SHA256).
            </p>
          </div>
        )}

        {auth.type === 'jwt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Access Token (JWT)</label>
              <textarea
                placeholder="eyJhbGciOi..."
                value={auth.config?.token || ''}
                onChange={(e) => updateConfig({ token: e.target.value })}
                rows={3}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px', fontFamily: 'var(--font-mono)', resize: 'vertical' }}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
              Sent as <code>Authorization: Bearer &lt;token&gt;</code>. If the token has an{' '}
              <code>exp</code> claim and auto-refresh is configured, Pulse exchanges the refresh token
              before it expires and updates the stored token.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Refresh Token (optional)</label>
              <input
                type="password"
                placeholder="Refresh token"
                value={auth.config?.refreshToken || ''}
                onChange={(e) => updateConfig({ refreshToken: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Refresh URL (optional)</label>
              <input
                type="text"
                placeholder="https://example.com/oauth/token"
                value={auth.config?.refreshUrl || ''}
                onChange={(e) => updateConfig({ refreshUrl: e.target.value })}
                style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Client ID (optional)</label>
                <input
                  type="text"
                  value={auth.config?.clientId || ''}
                  onChange={(e) => updateConfig({ clientId: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Client Secret (optional)</label>
                <input
                  type="password"
                  value={auth.config?.clientSecret || ''}
                  onChange={(e) => updateConfig({ clientSecret: e.target.value })}
                  style={{ padding: '8px', background: 'var(--bg-deep)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', fontSize: '12px' }}
                />
              </div>
            </div>
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
