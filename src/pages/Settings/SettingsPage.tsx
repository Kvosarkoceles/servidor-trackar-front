import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Database,
  Gauge,
  LogOut,
  Map as MapIcon,
  RefreshCw,
  ServerCog,
  Sliders,
  Trash2,
  Wifi,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select, Toggle } from '@/components/ui/Field';
import { InfoNote } from '@/components/ui/Feedback';
import { ConnectionStatus } from '@/components/layout/ConnectionStatus';
import { getHealth } from '@/api/health';
import { listDevices } from '@/api/devices';
import { TILE_PROVIDER_LIST } from '@/components/maps/tiles';
import { clearGeocodeCache } from '@/utils/geocode';
import { useAuthStore } from '@/stores/authStore';
import { useDevicesStore } from '@/stores/devicesStore';
import { useSettingsStore, type MapProviderId } from '@/stores/settingsStore';
import { fmtDateTime, fmtRelative } from '@/utils/format';
import { toAppError } from '@/utils/errors';
import { ROUTES } from '@/utils/constants';
import type { SpeedUnit } from '@/utils/device';

/**
 * Configuración (requisito 24 y 7).
 *
 * Todos los ajustes son locales al navegador: el backend no ofrece endpoints de
 * preferencias de usuario (no hay cuentas).
 */
export function SettingsPage() {
  const navigate = useNavigate();
  const settings = useSettingsStore();

  const devices = useDevicesStore((state) => state.devices);
  const lastUpdatedAt = useDevicesStore((state) => state.lastUpdatedAt);
  const refreshCount = useDevicesStore((state) => state.refreshCount);
  const fetchDevices = useDevicesStore((state) => state.fetchDevices);
  const resetDevices = useDevicesStore((state) => state.reset);
  const logout = useAuthStore((state) => state.logout);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setTesting(true);
    setTestResult(null);
    setTestError(null);
    try {
      const health = await getHealth();
      const list = await listDevices();
      setTestResult(
        `Servicio ${health.service} (${health.status}). Dispositivos accesibles: ${list.length}.`,
      );
    } catch (error) {
      setTestError(toAppError(error).message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-content">Configuración</h1>
        <p className="text-xs text-content-muted">
          Preferencias locales del cliente y diagnóstico de conexión
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Apariencia y tiempo real */}
        <Card>
          <CardHeader title="Apariencia y tiempo real" icon={<Sliders className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <Toggle
              checked={settings.theme === 'dark'}
              onChange={(checked) => settings.setTheme(checked ? 'dark' : 'light')}
              label="Modo oscuro"
              description="Recomendado para sesiones largas de monitoreo."
            />

            <Field
              label="Intervalo de actualización de posiciones"
              hint="El backend no ofrece WebSocket ni SSE: la actualización es por polling."
            >
              {(id) => (
                <Select
                  id={id}
                  value={String(settings.pollingMs)}
                  onChange={(event) => settings.update({ pollingMs: Number(event.target.value) })}
                  options={[
                    { value: '2000', label: 'Cada 2 segundos (más carga)' },
                    { value: '5000', label: 'Cada 5 segundos (recomendado)' },
                    { value: '10000', label: 'Cada 10 segundos' },
                    { value: '30000', label: 'Cada 30 segundos' },
                    { value: '60000', label: 'Cada 60 segundos (menos carga)' },
                  ]}
                />
              )}
            </Field>

            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-content-muted">Estado</span>
                <ConnectionStatus compact />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-content-muted">
                <span>Última actualización</span>
                <span className="tabular-nums">
                  {lastUpdatedAt ? `${fmtDateTime(lastUpdatedAt)} · ${fmtRelative(lastUpdatedAt)}` : '—'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-content-muted">
                <span>Refrescos completados</span>
                <span className="tabular-nums">{refreshCount}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Interpretación de datos */}
        <Card>
          <CardHeader title="Interpretación de datos" icon={<Gauge className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <Field
              label="Unidad de la velocidad almacenada"
              hint="El backend guarda el valor tal cual lo envía el dispositivo, sin normalizar unidades."
            >
              {(id) => (
                <Select
                  id={id}
                  value={settings.speedUnit}
                  onChange={(event) => settings.update({ speedUnit: event.target.value as SpeedUnit })}
                  options={[
                    { value: 'kmh', label: 'km/h (valor directo)' },
                    { value: 'knots', label: 'nudos → km/h (x1.852)' },
                    { value: 'mph', label: 'mph → km/h (x1.609)' },
                  ]}
                />
              )}
            </Field>

            <Field
              label="Umbral de “sin conexión” (segundos)"
              hint="Tiempo sin reportar para marcar el dispositivo como offline."
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={30}
                  step={30}
                  value={settings.offlineThresholdSeconds}
                  onChange={(event) =>
                    settings.update({
                      offlineThresholdSeconds: Math.max(30, Number(event.target.value) || 300),
                    })
                  }
                />
              )}
            </Field>

            <Field label="Umbral de “en movimiento” (km/h)">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={0}
                  step={1}
                  value={settings.movingSpeedKmh}
                  onChange={(event) =>
                    settings.update({ movingSpeedKmh: Math.max(0, Number(event.target.value) || 0) })
                  }
                />
              )}
            </Field>

            <Field
              label="Máx. dispositivos con métricas agregadas"
              hint="Limita cuántos historiales se consultan al calcular el dashboard y las estadísticas de flota."
            >
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.dashboardMaxDevices}
                  onChange={(event) =>
                    settings.update({
                      dashboardMaxDevices: Math.max(1, Number(event.target.value) || 25),
                    })
                  }
                />
              )}
            </Field>
          </CardBody>
        </Card>

        {/* Mapa */}
        <Card>
          <CardHeader title="Mapa" icon={<MapIcon className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <Field label="Proveedor de mosaicos">
              {(id) => (
                <Select
                  id={id}
                  value={settings.mapProvider}
                  onChange={(event) =>
                    settings.update({ mapProvider: event.target.value as MapProviderId })
                  }
                  options={TILE_PROVIDER_LIST.map((provider) => ({
                    value: provider.id,
                    label: provider.label,
                  }))}
                />
              )}
            </Field>

            <Toggle
              checked={settings.geocoding}
              onChange={(checked) => settings.update({ geocoding: checked })}
              label="Geocodificación inversa (opcional)"
              description="Consulta Nominatim (OpenStreetMap) con caché para mostrar una dirección aproximada. Si el backend añade su propio geocodificador, se sustituye esta llamada."
            />

            <Button
              size="sm"
              variant="secondary"
              onClick={() => clearGeocodeCache()}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              Vaciar caché de direcciones
            </Button>
          </CardBody>
        </Card>

        {/* Conexión */}
        <Card>
          <CardHeader title="Conexión con el backend" icon={<ServerCog className="h-4 w-4" />} />
          <CardBody className="space-y-4">
            <Field
              label="URL base de la API"
              hint="Debe apuntar a la raíz /api del backend desplegado."
            >
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  value={settings.apiBaseUrl}
                  onChange={(event) => settings.update({ apiBaseUrl: event.target.value })}
                  placeholder="https://tu-dominio.vercel.app/api"
                />
              )}
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void runDiagnostics()}
                loading={testing}
                icon={<Activity className="h-3.5 w-3.5" />}
              >
                Probar conexión
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void fetchDevices()}
                icon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Refrescar ahora
              </Button>
            </div>

            {testResult ? (
              <p className="rounded-lg border border-status-moving/30 bg-status-moving/5 px-3 py-2 text-[11px] text-content">
                <Wifi className="mr-1 inline h-3 w-3" aria-hidden />
                {testResult}
              </p>
            ) : null}
            {testError ? (
              <p role="alert" className="rounded-lg border border-status-offline/30 bg-status-offline/5 px-3 py-2 text-[11px] text-content">
                {testError}
              </p>
            ) : null}

            <div className="rounded-lg border border-line p-3 text-[11px] text-content-muted">
              <p className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" aria-hidden />
                Dispositivos cargados: <span className="text-content">{devices.length}</span>
              </p>
              <p className="mt-1">
                La API Key se guarda como credencial de sesión y no puede mostrarse en texto claro
                desde aquí.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => settings.reset()}
                icon={<Trash2 className="h-3.5 w-3.5" />}
              >
                Restablecer preferencias
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  resetDevices();
                  logout();
                  navigate(ROUTES.login, { replace: true });
                }}
                icon={<LogOut className="h-3.5 w-3.5" />}
              >
                Cerrar sesión
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <InfoNote title="Funcionalidades del backend que aún no existen">
        <ul className="list-disc space-y-1 pl-4">
          <li>
            <span className="text-content">Login de usuarios / roles:</span> la API se protege con
            una única API Key global.
          </li>
          <li>
            <span className="text-content">Eventos y alertas:</span> falta{' '}
            <span className="font-mono">GET /api/events</span>.
          </li>
          <li>
            <span className="text-content">Estadísticas del servidor:</span> las métricas se calculan
            en el cliente desde el historial.
          </li>
          <li>
            <span className="text-content">Geocercas:</span> falta{' '}
            <span className="font-mono">GET /api/geofences</span>.
          </li>
          <li>
            <span className="text-content">Gestión de dispositivos:</span> no hay endpoints de alta,
            edición o baja de dispositivos.
          </li>
          <li>
            <span className="text-content">Notificaciones push:</span> no existe integración de
            notificaciones.
          </li>
        </ul>
      </InfoNote>
    </div>
  );
}
