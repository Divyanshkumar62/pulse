import { useEffect, useRef } from 'react';
import { useMonitorStore, MonitorCheck, CheckRun } from '../../stores/useMonitorStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { sendRequest } from '../../hooks/useTauri';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export default function MonitorEngine() {
  const { monitors, updateMonitor, addRun } = useMonitorStore();
  const { settings } = useSettingsStore();
  const lastRunRef = useRef<Record<string, number>>({});

  useEffect(() => {
    // Request notification permission on mount
    const checkPermission = async () => {
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === 'granted';
      }
    };
    checkPermission();

    const intervalId = setInterval(async () => {
      const now = Date.now();
      const activeMonitors = monitors.filter(m => m.isActive);

      for (const monitor of activeMonitors) {
        const lastRun = lastRunRef.current[monitor.id] || 0;
        const intervalMs = monitor.interval * 60 * 1000;

        if (now - lastRun >= intervalMs) {
          lastRunRef.current[monitor.id] = now;
          await executeMonitorCheck(monitor);
        }
      }
    }, 10000); // Check every 10 seconds if any monitor needs to run

    return () => clearInterval(intervalId);
  }, [monitors, settings]);

  const executeMonitorCheck = async (monitor: MonitorCheck) => {
    if (!settings) return;

    try {
      const start = Date.now();
      // Execute via backend to bypass CORS
      const response = await sendRequest(
        monitor.method, 
        monitor.url, 
        {}, 
        { type: 'none', content: '' }, 
        settings
      );
      const responseTime = Date.now() - start;
      const statusCode = response.status;
      const status = statusCode >= 200 && statusCode < 300 ? 'healthy' :
                    statusCode >= 300 && statusCode < 400 ? 'degraded' : 'failing';

      handleResult(monitor, status, statusCode, responseTime);

    } catch (error) {
      handleResult(monitor, 'failing', 0, 0);
    }
  };

  const handleResult = async (monitor: MonitorCheck, newStatus: string, statusCode: number, responseTime: number) => {
    const timestamp = new Date().toLocaleTimeString();
    
    // Check if status changed to failing
    if (monitor.status !== 'failing' && newStatus === 'failing') {
      try {
        if (await isPermissionGranted()) {
          sendNotification({ 
            title: 'API Monitor Alert', 
            body: `Monitor "${monitor.name}" is failing.` 
          });
        }
      } catch (e) {
        console.error("Failed to send OS notification", e);
      }
    } else if (monitor.status === 'failing' && newStatus === 'healthy') {
      try {
        if (await isPermissionGranted()) {
          sendNotification({ 
            title: 'API Monitor Recovery', 
            body: `Monitor "${monitor.name}" is back online.` 
          });
        }
      } catch (e) {
        console.error("Failed to send OS notification", e);
      }
    }

    const newRun: CheckRun = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      statusCode,
      responseTime
    };

    updateMonitor(monitor.id, {
      status: newStatus as any,
      responseTime,
      statusCode,
      lastCheck: timestamp
    });
    
    addRun(monitor.id, newRun);
  };

  return null;
}
