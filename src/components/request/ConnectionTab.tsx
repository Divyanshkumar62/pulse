import React, { useState } from 'react';
import { useTabStore } from '../../stores/useTabStore';
import { getSessionCookies, clearSessionCookies } from '../../hooks/useTauri';
import { SessionCookie } from '../../types';
import { toast } from 'sonner';

/**
 * Connection settings for the active request: the shared cookie jar and a
 * per-request proxy override (HTTP/HTTPS/SOCKS5).
 */
export default function ConnectionTab() {
  const { tabs, activeTabId, updateActiveTabRequest } = useTabStore();
  const [cookies, setCookies] = useState<SessionCookie[] | null>(null);
  const [isLoadingCookies, setIsLoadingCookies] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);
  if (!activeTab || activeTab.type !== 'request' || !activeTab.request) return null;

  const request = activeTab.request;
  const useCookies = request.useCookies === true;
  const proxyOverride = request.proxyOverride || { enabled: false, url: '' };

  // Requests in the same collection share a cookie jar; standalone requests
  // get their own jar so sessions never leak between tabs.
  const sessionKey = request.collectionId || request.id;

  const update = (updates: Record<string, any>) => {
    updateActiveTabRequest(updates);
  };

  const updateProxy = (updates: Partial<typeof proxyOverride>) => {
    updateActiveTabRequest({ proxyOverride: { ...proxyOverride, ...updates } });
  };

  const handleViewCookies = async () => {
    if (!request.url) {
      toast.error('Enter a request URL to see matching cookies');
      return;
    }
    setIsLoadingCookies(true);
    try {
      const list = await getSessionCookies(sessionKey, request.url);
      setCookies(list);
    } catch (e: any) {
      toast.error('Failed to load cookies: ' + String(e.message || e));
    } finally {
      setIsLoadingCookies(false);
    }
  };

  const handleClearCookies = async () => {
    try {
      await clearSessionCookies(sessionKey);
      setCookies(null);
      toast.success('Cookie jar cleared');
    } catch (e: any) {
      toast.error('Failed to clear cookies: ' + String(e.message || e));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px',
    background: 'var(--bg-deep)',
    border: '1px solid var(--border-default)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '12px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'var(--text-tertiary)',
    display: 'block',
    marginBottom: '6px',
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', width: '100%', overflowY: 'auto' }}>
      {/* Cookie Jar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={useCookies}
            onChange={(e) => update({ useCookies: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
          />
          Cookie Jar (stateful session)
        </label>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
          Send and store cookies across requests in this session, like a browser. Use it for login flows
          where a session cookie must persist between requests.
        </p>

        {useCookies && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className="btn-secondary"
              onClick={handleViewCookies}
              disabled={isLoadingCookies}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}
            >
              {isLoadingCookies ? 'Loading...' : 'View Cookies'}
            </button>
            <button
              className="btn-secondary"
              onClick={handleClearCookies}
              style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-danger, #f87171)' }}
            >
              Clear Cookies
            </button>
          </div>
        )}

        {cookies && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Cookies for this request ({cookies.length})
            </div>
            {cookies.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                No cookies stored yet. Send a request that sets cookies first.
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {cookies.map((c, idx) => (
                  <div
                    key={`${c.name}-${idx}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '6px 12px',
                      borderBottom: idx < cookies.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{c.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all', maxWidth: '55%', textAlign: 'right' }}>{c.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <input
            type="checkbox"
            checked={proxyOverride.enabled}
            onChange={(e) => updateProxy({ enabled: e.target.checked })}
            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
          />
          Use custom proxy for this request
        </label>
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
          Overrides the proxy from Settings for this request only. Supports HTTP, HTTPS and SOCKS5.
        </p>
        {proxyOverride.enabled && (
          <div>
            <label style={labelStyle}>Proxy URL (e.g. http://host:8080 or socks5://host:1080)</label>
            <input
              type="text"
              placeholder="http://user:pass@host:port"
              value={proxyOverride.url || ''}
              onChange={(e) => updateProxy({ url: e.target.value })}
              style={inputStyle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
