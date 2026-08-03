import { CustomerList } from '@/components/dashboard/customer-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCustomersPage() {
  return (
    <main className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-heading">Gestión de Clientes</h1>
            <p className="text-muted-foreground mt-2">
              Visualiza y gestiona la información de los clientes registrados.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Clientes</CardTitle>
              <CardDescription>
                Consulta el registro de clientes con sus canales, fechas de creación y estados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerList />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
