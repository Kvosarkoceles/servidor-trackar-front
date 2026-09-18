import { useEffect } from 'react';

import { useAlertsStore } from '@/stores/alertsStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';

/**
 * Polling del endpoint `GET /api/devices`.
 *
 * El backend no ofrece WebSocket, SSE ni MQTT: la actualización en tiempo real
 * se logra con polling configurable (por defecto 5 s). Se pausa cuando la
 * pestaña no está visible para no gastar peticiones ni batería.
 */
export function useDevicesPolling(): void {
  const pollingMs = useSettingsStore((state) => state.pollingMs);
  const authStatus = useAuthStore((state) => state.status);
  const fetchDevices = useDevicesStore((state) => state.fetchDevices);
  const devices = useDevicesStore((state) => state.devices);
  const syncFromDevices = useAlertsStore((state) => state.syncFromDevices);

  // Carga inicial.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    void fetchDevices({ silent: false });
  }, [authStatus, fetchDevices]);

  // Refresco periódico.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    if (!Number.isFinite(pollingMs) || pollingMs < 1000) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      stop();
      timer = setInterval(() => void fetchDevices({ silent: true }), pollingMs);
    };

    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void fetchDevices({ silent: true });
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authStatus, pollingMs, fetchDevices]);

  // Las alertas se recalculan con cada actualización real de dispositivos.
  useEffect(() => {
    syncFromDevices(devices);
  }, [devices, syncFromDevices]);
}
