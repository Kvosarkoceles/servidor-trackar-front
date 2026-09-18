import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, Radar, ServerCrash, ShieldCheck, Wifi } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Toggle } from '@/components/ui/Field';
import { InfoNote } from '@/components/ui/Feedback';
import { getHealth } from '@/api/health';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { fmtDateTime } from '@/utils/format';
import { ROUTES } from '@/utils/constants';

type BackendState = 'checking' | 'ok' | 'down';

/**
 * Pantalla de acceso (requisito 19).
 *
 * ⚠ El backend NO implementa login de usuarios (ni JWT, ni sesiones, ni OAuth):
 * protege todo con una **API Key** (`GPS_API_KEY`) enviada como
 * `Authorization: Bearer`. Por tanto esta pantalla solicita esa clave, la valida
 * contra `GET /api/devices` y la guarda como credencial de sesión.
 *
 * Si el backend incorpora autenticación por usuario, basta con sustituir
 * `useAuthStore.login` por la llamada correspondiente.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const loading = useAuthStore((state) => state.loading);
  const error = useAuthStore((state) => state.error);
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const login = useAuthStore((state) => state.login);

  const apiBaseUrl = useSettingsStore((state) => state.apiBaseUrl);
  const updateSettings = useSettingsStore((state) => state.update);

  const [apiKey, setApiKey] = useState('');
  const [remember, setRemember] = useState(true);
  const [backend, setBackend] = useState<BackendState>('checking');
  const [healthCheckedAt, setHealthCheckedAt] = useState<number | null>(null);

  // Comprueba el endpoint público /api/health para distinguir "servidor caído"
  // de "clave incorrecta".
  useEffect(() => {
    let active = true;
    setBackend('checking');

    getHealth()
      .then(() => {
        if (!active) return;
        setBackend('ok');
        setHealthCheckedAt(Date.now());
      })
      .catch(() => {
        if (!active) return;
        setBackend('down');
      });

    return () => {
      active = false;
    };
  }, [apiBaseUrl]);

  if (status === 'authenticated') {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await login(apiKey, remember);
    if (ok) navigate(ROUTES.dashboard, { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Radar className="h-5 w-5" aria-hidden />
          </span>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold tracking-tight text-content">GPS Monitor</h1>
            <p className="text-[11px] uppercase tracking-wider text-content-muted">
              Centro de rastreo en tiempo real
            </p>
          </div>
        </div>

        <Card className="p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-content">Iniciar sesión</h2>
              <p className="mt-0.5 text-xs text-content-muted">
                Introduce la clave de API configurada en el backend (
                <code className="font-mono">GPS_API_KEY</code>).
              </p>
            </div>

            {sessionExpired ? (
              <div
                role="alert"
                className="rounded-lg border border-status-stopped/40 bg-status-stopped/10 px-3 py-2 text-xs text-content"
              >
                Tu sesión finalizó. Vuelve a introducir la clave de API.
              </div>
            ) : null}

            <Field
              label="Clave de API"
              error={
                error && error.kind !== 'network' && error.kind !== 'timeout'
                  ? error.kind === 'unauthorized' || error.kind === 'forbidden'
                    ? 'La clave no es válida o el backend exige una clave que no se proporcionó.'
                    : error.message
                  : null
              }
              hint="Si el backend no exige clave (GPS_API_KEY vacía), puedes continuar sin escribir nada."
            >
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="f4e6…  (opcional si el backend está en modo abierto)"
                  autoFocus
                />
              )}
            </Field>

            <Field
              label="URL del backend"
              hint="Puedes cambiarla si el servicio está en otro dominio."
            >
              {(id) => (
                <Input
                  id={id}
                  type="url"
                  value={apiBaseUrl}
                  onChange={(event) => updateSettings({ apiBaseUrl: event.target.value })}
                  placeholder="https://tu-dominio.vercel.app/api"
                />
              )}
            </Field>

            <Toggle
              checked={remember}
              onChange={setRemember}
              label="Recordar sesión"
              description="Guarda la clave en este navegador (localStorage)."
            />

            {error && (error.kind === 'network' || error.kind === 'timeout' || backend === 'down') ? (
              <div
                role="alert"
                className="rounded-lg border border-status-offline/40 bg-status-offline/10 px-3 py-2 text-xs text-content"
              >
                {backend === 'down'
                  ? 'El backend no responde. Verifica la URL y que el servicio esté desplegado.'
                  : error.message}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={loading}
              icon={<KeyRound className="h-4 w-4" />}
            >
              Entrar
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[11px] text-content-muted">
            <span className="flex items-center gap-1.5">
              {backend === 'ok' ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-status-moving" aria-hidden />
                  Backend disponible
                </>
              ) : backend === 'down' ? (
                <>
                  <ServerCrash className="h-3.5 w-3.5 text-status-offline" aria-hidden />
                  Backend sin respuesta
                </>
              ) : (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" aria-hidden />
                  Comprobando backend…
                </>
              )}
            </span>
            {healthCheckedAt ? <span>{fmtDateTime(healthCheckedAt)}</span> : null}
          </div>
        </Card>

        <div className="mt-4">
          <InfoNote title="Cómo funciona la autenticación de este backend">
            <p>
              El servicio <span className="font-mono">servidor-trackar</span> no expone login de
              usuarios: protege sus endpoints con una API Key única (
              <span className="font-mono">GPS_API_KEY</span>) que se envía en{' '}
              <span className="font-mono">Authorization: Bearer</span>.
            </p>
            <p className="mt-2">
              Esta clave viaja al navegador, por lo que cualquiera con acceso al bundle podría
              extraerla. Para un despliegue multiusuario se necesita autenticación real en el
              backend (ver <span className="font-mono">API_INTEGRATION.md</span>).
            </p>
          </InfoNote>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-content-muted">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          La autorización siempre la valida el backend; el frontend no concede permisos.
        </p>
      </div>
    </div>
  );
}
