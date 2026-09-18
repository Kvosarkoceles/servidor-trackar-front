import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ROUTES } from '@/utils/constants';

/** Página 404. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="max-w-md p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-panel-soft text-content-muted">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-content">Ruta no encontrada</h1>
        <p className="mt-1 text-sm text-content-muted">
          La dirección solicitada no existe en la aplicación.
        </p>
        <Link to={ROUTES.dashboard} className="mt-5 inline-block">
          <Button variant="primary">Volver al panel</Button>
        </Link>
      </Card>
    </div>
  );
}
