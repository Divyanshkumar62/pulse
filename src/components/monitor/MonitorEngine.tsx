import { useEffect, useRef } from 'react';
import { useMonitorStore, MonitorCheck, CheckRun } from '../../stores/useMonitorStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { sendRequest } from '../../hooks/useTauri';
import { sendNotification, isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

export default function MonitorEngine() {
  const { monitors, updateMonitor, addRun } = useMonitorStore();
  const { settings } = useSettingsStore();
  
  const monitorsRef = useRef(monitors);
  const settingsRef = useRef(settings);
  const lastRunRef = useRef<Record<string, number>>({});

  useEffect(() => {
    monitorsRef.current = monitors;
  }, [monitors]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const initNotifications = async () => {
      try {
        let permissionGranted = await isPermissionGranted();
        if (!permissionGranted) {
          const permission = await requestPermission();
          permissionGranted = permission === 'granted';
        }
      } catch (e) {
        // Silent error in production
      }
    };
    initNotifications();

    const intervalId = setInterval(async () => {
      const now = Date.now();
      const currentMonitors = monitorsRef.current;
      const currentSettings = settingsRef.current;

      if (!currentSettings) return;

      const activeMonitors = currentMonitors.filter(m => m.isActive);

      for (const monitor of activeMonitors) {
        const lastRun = lastRunRef.current[monitor.id] || 0;
        const intervalMs = (monitor.interval || 5) * 60 * 1000;

        if (now - lastRun >= intervalMs) {
          lastRunRef.current[monitor.id] = now;
          executeMonitorCheck(monitor, currentSettings);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const executeMonitorCheck = async (monitor: MonitorCheck, settings: any) => {
    try {
      const start = Date.now();
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
    
    const statusChangedToFailing = monitor.status !== 'failing' && newStatus === 'failing';
    const statusChangedToHealthy = monitor.status === 'failing' && (newStatus === 'healthy' || newStatus === 'degraded');

    if (statusChangedToFailing || statusChangedToHealthy) {
      try {
        const hasPermission = await isPermissionGranted();
        if (hasPermission) {
          sendNotification({ 
            title: statusChangedToFailing ? 'API Monitor Alert' : 'API Monitor Recovery', 
            body: statusChangedToFailing 
                ? `Monitor "${monitor.name}" is failing with status ${statusCode || 'Error'}.`
                : `Monitor "${monitor.name}" is back online.`,
          });
        }
      } catch (e) {
        // Silent error in production
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
