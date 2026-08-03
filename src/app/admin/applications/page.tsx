"use client";

import { useState } from 'react';
import { ApplicationList } from '@/components/dashboard/application-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AdminApplicationForm } from '@/components/applications/admin-application-form';

export default function AdminDashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <main className="flex-1 bg-muted/20">
      <div className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="flex flex-col space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Panel de Administración</h1>
              <p className="text-muted-foreground mt-2">
                Consulta y gestiona las solicitudes de crédito que se encuentran en proceso.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 rounded-lg bg-primary hover:bg-primary/95 text-white font-heading font-bold shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4.5 w-4.5" /> Nueva Solicitud Asistida
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Listado de Solicitudes</CardTitle>
              <CardDescription>
                Consulta el listado completo de solicitudes y utiliza los filtros para encontrar lo que necesitas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationList adminMode={true} />
            </CardContent>
          </Card>
        </div>
      </div>

      <AdminApplicationForm open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </main>
  );
}
