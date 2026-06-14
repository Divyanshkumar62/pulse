import { useState } from 'react';
import { Play, Shield, Settings2, Globe, Lock, FileText, List } from 'lucide-react';
import { toast } from 'sonner';
import KeyValueTable from '../request/KeyValueTable';
import { startLoadTest } from '../../hooks/useTauri';
import { buildLoadTestConfig } from '../../services/loadTesting';
import { useLoadTestStore } from '../../stores/useLoadTestStore';
import type { LoadTestConfigDraft } from '../../types/loadTesting';
import MethodSelector from '../ui/MethodSelector';
import '../../styles/components/load-testing.css';

type PayloadTab = 'params' | 'headers' | 'auth' | 'body';

export default function LoadTestingBuilder() {
  const {
    draftConfig,
    updateDraftConfig,
    currentStage,
    isStarting,
    isStopping,
    setStartPending,
    setActiveRunId,
  } = useLoadTestStore();

  const [activeTab, setActiveTab] = useState<PayloadTab>('headers');

  const isRunning = currentStage === 'STARTED' || currentStage === 'RUNNING';
  const isBusy = isRunning || isStarting || isStopping;

  const handleStart = async () => {
    const validationError = validateDraft(draftConfig);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setStartPending(true);

    try {
      const runId = await startLoadTest(buildLoadTestConfig(draftConfig));
      setActiveRunId(runId);
      toast.success('Load test request accepted');
    } catch (error: any) {
      setStartPending(false);
      toast.error(error?.message || 'Failed to start load test');
    }
  };

  return (
    <div className="load-test-shell custom-scrollbar-mini">
      <div className="load-test-builder-header">
        <div className="load-test-builder-url-bar">
          <MethodSelector
            method={draftConfig.method}
            methods={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']}
            onChange={(m) => updateDraftConfig({ method: m })}
            disabled={isBusy}
          />
          <input
            type="text"
            className="url-input-field"
            placeholder="https://api.example.com/v1/resource"
            value={draftConfig.url}
            disabled={isBusy}
            onChange={(e) => updateDraftConfig({ url: e.target.value })}
          />
          <button 
            className="send-btn-premium"
            onClick={handleStart}
            disabled={isBusy}
          >
            {isStarting ? (
              <span>Starting...</span>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Launch Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="load-test-builder-grid">
        <div className="load-test-builder-column left">
          <div className="load-test-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="load-test-builder-tabs">
              <TabButton id="params" label="Params" icon={List} active={activeTab === 'params'} onClick={() => setActiveTab('params')} />
              <TabButton id="headers" label="Headers" icon={Globe} active={activeTab === 'headers'} onClick={() => setActiveTab('headers')} />
              <TabButton id="auth" label="Auth" icon={Lock} active={activeTab === 'auth'} onClick={() => setActiveTab('auth')} />
              <TabButton id="body" label="Body" icon={FileText} active={activeTab === 'body'} onClick={() => setActiveTab('body')} />
            </div>
            
            <div className="load-test-builder-tab-content custom-scrollbar-mini">
              {activeTab === 'params' && (
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Query parameters to append to the URL.</p>
                  <KeyValueTable
                    items={[]}
                    onChange={() => {}}
                    keyPlaceholder="Parameter"
                    valuePlaceholder="Value"
                  />
                </div>
              )}
              {activeTab === 'headers' && (
                <div style={{ padding: '20px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>HTTP headers to send with each request.</p>
                  <KeyValueTable
                    items={draftConfig.headers}
                    onChange={(headers) => updateDraftConfig({ headers })}
                    keyPlaceholder="Header"
                    valuePlaceholder="Value"
                  />
                </div>
              )}
              {activeTab === 'auth' && (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <Lock size={32} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p>Auth configuration is inherited from the URL or headers.</p>
                    <span style={{ fontSize: '11px' }}>Support for complex Auth types coming in Phase 2.</span>
                </div>
              )}
              {activeTab === 'body' && (
                <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '12px' }}>Request body (JSON or Raw text).</p>
                  <textarea
                    className="load-test-textarea"
                    style={{ flex: 1, minHeight: '300px' }}
                    value={draftConfig.body}
                    disabled={isBusy}
                    onChange={(e) => updateDraftConfig({ body: e.target.value })}
                    placeholder='{"key": "value"}'
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="load-test-builder-column right">
          <div className="load-test-card">
            <div className="load-test-card-header" style={{ marginBottom: '20px' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Settings2 size={16} className="text-accent" />
                  Load Profile
                </h3>
                <p>Define the intensity and duration of the test.</p>
              </div>
            </div>

            <div className="load-test-section">
                <div className="load-test-mode-switch" style={{ width: '100%', display: 'flex' }}>
                    <button
                        className={draftConfig.loadMode.type === 'constantVU' ? 'active' : ''}
                        style={{ flex: 1 }}
                        disabled={isBusy}
                        onClick={() => updateDraftConfig({ loadMode: { type: 'constantVU' } })}
                    >
                        Constant VUs
                    </button>
                    <button
                        className={draftConfig.loadMode.type === 'constantRPS' ? 'active' : ''}
                        style={{ flex: 1 }}
                        disabled={isBusy}
                        onClick={() =>
                        updateDraftConfig({
                            loadMode: {
                            type: 'constantRPS',
                            targetRps:
                                draftConfig.loadMode.type === 'constantRPS'
                                ? draftConfig.loadMode.targetRps
                                : 50,
                            },
                        })
                        }
                    >
                        Constant RPS
                    </button>
                </div>

                <div className="load-test-builder-controls">
                    <SliderField
                        label="Virtual Users"
                        value={draftConfig.virtualUsers}
                        min={1}
                        max={500}
                        step={1}
                        unit="VUs"
                        disabled={isBusy}
                        onChange={(val) => updateDraftConfig({ virtualUsers: val })}
                    />

                    {draftConfig.loadMode.type === 'constantRPS' && (
                        <SliderField
                            label="Target Throughput"
                            value={draftConfig.loadMode.targetRps}
                            min={1}
                            max={1000}
                            step={1}
                            unit="RPS"
                            disabled={isBusy}
                            onChange={(val) => updateDraftConfig({ loadMode: { type: 'constantRPS', targetRps: val } })}
                        />
                    )}

                    <SliderField
                        label="Test Duration"
                        value={draftConfig.durationSeconds}
                        min={10}
                        max={3600}
                        step={1}
                        unit="sec"
                        disabled={isBusy}
                        onChange={(val) => updateDraftConfig({ durationSeconds: val })}
                    />

                    <SliderField
                        label="Ramp-up Period"
                        value={draftConfig.rampUpSeconds}
                        min={0}
                        max={draftConfig.durationSeconds}
                        step={1}
                        unit="sec"
                        disabled={isBusy}
                        onChange={(val) => updateDraftConfig({ rampUpSeconds: val })}
                    />

                    <SliderField
                        label="Think Time"
                        value={draftConfig.thinkTimeMs || 0}
                        min={0}
                        max={5000}
                        step={1}
                        unit="ms"
                        disabled={isBusy}
                        onChange={(val) => updateDraftConfig({ thinkTimeMs: val || undefined })}
                    />
                </div>
            </div>

            <div className="load-test-section" style={{ marginTop: '24px' }}>
                <div className="load-test-card-header" style={{ marginBottom: '16px' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} className="text-accent" />
                    Performance Thresholds (Optional)
                  </h3>
                </div>
                <div className="load-test-builder-controls">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="text-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Max P95 Latency (ms)</label>
                            <input
                                type="number"
                                className="text-input"
                                placeholder="e.g. 300"
                                value={draftConfig.thresholds?.p95MaxMs || ''}
                                disabled={isBusy}
                                onChange={(e) => updateDraftConfig({ 
                                    thresholds: { 
                                        ...draftConfig.thresholds, 
                                        p95MaxMs: e.target.value ? Number(e.target.value) : null 
                                    } 
                                })}
                                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="text-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Max Error Rate (%)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="text-input"
                                placeholder="e.g. 1.0"
                                value={draftConfig.thresholds?.errorRateMaxPercent || ''}
                                disabled={isBusy}
                                onChange={(e) => updateDraftConfig({ 
                                    thresholds: { 
                                        ...draftConfig.thresholds, 
                                        errorRateMaxPercent: e.target.value ? Number(e.target.value) : null 
                                    } 
                                })}
                                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="text-label" style={{ display: 'block', marginBottom: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>Min Throughput (RPS)</label>
                            <input
                                type="number"
                                className="text-input"
                                placeholder="e.g. 500"
                                value={draftConfig.thresholds?.minRps || ''}
                                disabled={isBusy}
                                onChange={(e) => updateDraftConfig({ 
                                    thresholds: { 
                                        ...draftConfig.thresholds, 
                                        minRps: e.target.value ? Number(e.target.value) : null 
                                    } 
                                })}
                                style={{ width: '100%', padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', borderRadius: '6px', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="load-test-safety-limits">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
                    <Shield size={14} />
                    <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase' }}>Safety Limits</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <LimitItem label="Max VUs" value="500" />
                    <LimitItem label="Max RPS" value="1,000" />
                    <LimitItem label="Max Duration" value="1h" />
                    <LimitItem label="Max Payload" value="5MB" />
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ id, label, icon: Icon, active, onClick }: { id: string, label: string, icon: any, active: boolean, onClick: () => void }) {
  return (
    <button 
      className={`load-test-builder-tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function SliderField({ label, value, min, max, step, unit, disabled, onChange }: { label: string, value: number, min: number, max: number, step: number, unit: string, disabled: boolean, onChange: (val: number) => void }) {
    return (
        <div className="load-test-slider-field">
            <div className="load-test-slider-header">
                <span>{label}</span>
                <strong>{value.toLocaleString()} {unit}</strong>
            </div>
            <input 
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                className="load-test-range"
            />
        </div>
    );
}

function LimitItem({ label, value }: { label: string, value: string }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{label}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{value}</span>
        </div>
    );
}

function validateDraft(draft: LoadTestConfigDraft): string | null {
  if (!draft.url.trim()) {
    return 'A target URL is required';
  }

  try {
    new URL(draft.url.trim());
  } catch {
    return 'Enter a valid absolute URL';
  }

  if (draft.virtualUsers <= 0) {
    return 'Virtual users must be greater than zero';
  }

  if (draft.durationSeconds <= 0) {
    return 'Duration must be greater than zero';
  }

  if (draft.rampUpSeconds < 0 || draft.rampUpSeconds > draft.durationSeconds) {
    return 'Ramp-up must be between 0 and the total duration';
  }

  if (draft.loadMode.type === 'constantRPS' && draft.loadMode.targetRps <= 0) {
    return 'Target RPS must be greater than zero';
  }

  return null;
}
