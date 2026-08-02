'use client';

import { useRole } from '@/providers/role-provider';
import NewApplicationPage from '@/app/applications/new/page';
import { ApplicationList } from '@/components/dashboard/application-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { role } = useRole();

  if (role === 'CLIENT') {
    return <NewApplicationPage />;
  }

  return (
    <main className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Panel Principal</h1>
            <p className="text-muted-foreground mt-2">
              Gestiona el ciclo de vida de las solicitudes de crédito.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Solicitudes</CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de todas las solicitudes radicadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationList />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
