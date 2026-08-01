'use client';

import { useQuery } from '@tanstack/react-query';
import { applicationService, ApplicationStatus } from '@/services/application.service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import Link from 'next/link';

const getStatusColor = (status: ApplicationStatus) => {
  switch (status) {
    case ApplicationStatus.IN_PROGRESS:
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case ApplicationStatus.PENDING_VALIDATION:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case ApplicationStatus.FINALIZED:
      return 'bg-green-100 text-green-800 border-green-200';
    case ApplicationStatus.ABANDONED:
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusLabel = (status: ApplicationStatus) => {
  switch (status) {
    case ApplicationStatus.IN_PROGRESS:
      return 'En Proceso';
    case ApplicationStatus.PENDING_VALIDATION:
      return 'Pendiente Validación';
    case ApplicationStatus.FINALIZED:
      return 'Finalizada';
    case ApplicationStatus.ABANDONED:
      return 'Abandonada';
    default:
      return status;
  }
};

export function ApplicationList({ statusFilter }: { statusFilter?: ApplicationStatus } = {}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['applications', statusFilter],
    queryFn: () => applicationService.findAll(statusFilter ? { status: statusFilter } : {}),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Solicitudes Digitales</h2>
          <p className="text-sm text-muted-foreground">
            Gestiona las solicitudes de crédito de libre destino.
          </p>
        </div>
        <Link href="/applications/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nueva Solicitud
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID de Solicitud</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-red-500">
                  Error al cargar las solicitudes. Verifica la conexión con el servidor.
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No hay solicitudes registradas.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((application) => (
                <TableRow key={application.id}>
                  <TableCell className="font-medium text-xs font-mono">
                    {application.id}
                  </TableCell>
                  <TableCell>{application.clientId}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">{application.channel.toLowerCase()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(application.createdAt), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(application.status)}>
                      {getStatusLabel(application.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/applications/${application.id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
