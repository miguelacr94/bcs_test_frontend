'use client';

import { useQuery } from '@tanstack/react-query';
import { applicationRepository, ApplicationStatus } from '@/infrastructure/repositories';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatRadicationDate } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { Plus, Eye } from 'lucide-react';
import Link from 'next/link';

const getStatusColor = (status: ApplicationStatus) => {
  switch (status) {
    case ApplicationStatus.IN_PROGRESS:
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    case ApplicationStatus.PENDING_VALIDATION:
      return 'bg-amber-50 text-amber-700 border-amber-200/80';
    case ApplicationStatus.FINALIZED:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    case ApplicationStatus.ABANDONED:
      return 'bg-rose-50 text-rose-700 border-rose-200/80';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200/80';
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
    queryFn: () => applicationRepository.findAll(statusFilter ? { status: statusFilter } : {}),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-extrabold text-slate-800 tracking-tight">Solicitudes Digitales</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Gestiona las solicitudes de crédito de libre destino y su trazabilidad.
          </p>
        </div>
        <Link href="/applications/new">
          <Button className="h-10 rounded-lg bg-primary hover:bg-primary/95 text-white font-heading font-bold shadow-md shadow-primary/10 transition-all active:scale-[0.98]">
            <Plus className="mr-2 h-4.5 w-4.5" /> Nueva Solicitud
          </Button>
        </Link>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <Table>
          <TableHeader className="bg-slate-50/75 border-b border-border/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-600 h-12">ID de Solicitud</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Cliente</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Canal</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Fecha de Creación</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12">Estado</TableHead>
              <TableHead className="font-semibold text-slate-600 h-12 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-slate-400 font-medium">
                  Cargando solicitudes...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-rose-500 font-medium">
                  Error al cargar las solicitudes. Verifica la conexión con el servidor.
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-slate-400 font-medium">
                  No hay solicitudes registradas.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((application) => (
                <TableRow key={application.id} className="hover:bg-slate-50/45 transition-colors border-b border-border/20">
                  <TableCell className="font-medium text-xs font-mono text-slate-500">
                    {application.id}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700">{application.clientId}</TableCell>
                  <TableCell className="capitalize font-medium text-slate-500">{application.channel.toLowerCase()}</TableCell>
                  <TableCell className="text-slate-500 font-medium">
                    {formatRadicationDate(application.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs px-2.5 py-1 font-semibold rounded-lg border ${getStatusColor(application.status)}`}>
                      {getStatusLabel(application.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/applications/${application.id}`}>
                      <Button variant="ghost" size="sm" className="h-9 px-3 rounded-lg text-[#0066cc] hover:text-[#0052a3] hover:bg-secondary font-semibold">
                        <Eye className="mr-1.5 h-4 w-4" /> Ver Detalles
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
