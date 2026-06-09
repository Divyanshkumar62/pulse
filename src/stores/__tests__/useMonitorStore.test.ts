import { describe, it, expect, beforeEach } from 'vitest';
import { useMonitorStore } from '../useMonitorStore';

describe('useMonitorStore', () => {
  beforeEach(() => {
    useMonitorStore.setState({ monitors: [], checkRuns: {}, isChecking: false });
  });

  it('should add a monitor with default pending status', () => {
    useMonitorStore.getState().addMonitor({
      name: 'Test API',
      url: 'https://api.test.com',
      method: 'GET',
      interval: 5,
      isActive: false
    });

    const monitors = useMonitorStore.getState().monitors;
    expect(monitors.length).toBe(1);
    expect(monitors[0].name).toBe('Test API');
    expect(monitors[0].status).toBe('pending');
    expect(monitors[0].id).toBeDefined();
  });

  it('should update monitor details', () => {
    useMonitorStore.getState().addMonitor({
      name: 'Test API',
      url: 'https://api.test.com',
      method: 'GET',
      interval: 5,
      isActive: false
    });

    const monitorId = useMonitorStore.getState().monitors[0].id;

    useMonitorStore.getState().updateMonitor(monitorId, { status: 'healthy', responseTime: 120 });

    const updatedMonitor = useMonitorStore.getState().monitors[0];
    expect(updatedMonitor.status).toBe('healthy');
    expect(updatedMonitor.responseTime).toBe(120);
  });

  it('should delete a monitor and its runs', () => {
    useMonitorStore.getState().addMonitor({
      name: 'Test API',
      url: 'https://api.test.com',
      method: 'GET',
      interval: 5,
      isActive: false
    });

    const monitorId = useMonitorStore.getState().monitors[0].id;
    useMonitorStore.getState().addRun(monitorId, { id: 'run1', timestamp: '10:00', statusCode: 200, responseTime: 100 });

    expect(useMonitorStore.getState().checkRuns[monitorId]).toBeDefined();

    useMonitorStore.getState().deleteMonitor(monitorId);

    expect(useMonitorStore.getState().monitors.length).toBe(0);
    expect(useMonitorStore.getState().checkRuns[monitorId]).toBeUndefined();
  });

  it('should keep a maximum of 20 check runs per monitor', () => {
    const monitorId = 'test-monitor-id';
    
    // Add 25 runs
    for (let i = 0; i < 25; i++) {
      useMonitorStore.getState().addRun(monitorId, {
        id: `run-${i}`,
        timestamp: `10:${i}`,
        statusCode: 200,
        responseTime: 100
      });
    }

    const runs = useMonitorStore.getState().checkRuns[monitorId];
    expect(runs.length).toBe(20);
    // The most recently added run should be the first one in the list (unshifted)
    expect(runs[0].id).toBe('run-24');
    expect(runs[19].id).toBe('run-5');
  });
});
