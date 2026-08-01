import { ApplicationList } from '@/components/dashboard/application-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApplicationStatus } from '@/services/application.service';

export default function AdminDashboard() {
  return (
    <main className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
            <p className="text-muted-foreground mt-2">
              Consulta y gestiona las solicitudes de crédito que se encuentran en proceso.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Solicitudes en Proceso</CardTitle>
              <CardDescription>
                Listado de solicitudes que actualmente están siendo procesadas o gestionadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationList statusFilter={ApplicationStatus.IN_PROGRESS} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
